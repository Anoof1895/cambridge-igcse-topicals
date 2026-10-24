#!/usr/bin/env python3
"""
Cloudflare R2 Multi-Threaded Uploader for Cambridge IGCSE Topicals
Uploads cropped question and mark scheme PNGs to Cloudflare R2 bucket with
optimal CDN caching headers (public, max-age=31536000, immutable).
"""

import argparse
import concurrent.futures
import mimetypes
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from tqdm import tqdm


def load_env_file(env_path: Path) -> Dict[str, str]:
    """Load environment variables from a .env file."""
    env = {}
    if not env_path.exists():
        return env

    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                env[key.strip()] = val.strip().strip("'\"")
    return env


def get_r2_client(account_id: str, access_key: str, secret_key: str, max_pool: int = 50):
    """Initialize S3 client targeting Cloudflare R2 endpoint."""
    config = Config(
        retries={"max_attempts": 5, "mode": "standard"},
        max_pool_connections=max_pool,
    )
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
        config=config,
    )


def fetch_existing_r2_keys(s3_client, bucket_name: str, prefix: str = "output/") -> Dict[str, int]:
    """
    Fast pre-fetch of existing object keys and sizes from R2 via list_objects_v2 pagination.
    Avoids tens of thousands of individual HTTP HEAD requests.
    """
    existing: Dict[str, int] = {}
    paginator = s3_client.get_paginator("list_objects_v2")

    print(f"Scanning existing objects in bucket '{bucket_name}' with prefix '{prefix}'...")
    try:
        page_iterator = paginator.paginate(Bucket=bucket_name, Prefix=prefix)
        for page in page_iterator:
            for obj in page.get("Contents", []):
                existing[obj["Key"]] = obj["Size"]
    except Exception as e:
        print(f"Warning: Could not paginate existing objects ({e}). Will check via head_object.")
    return existing


def check_object_exists_head(s3_client, bucket_name: str, key: str, local_size: int) -> bool:
    """Check if an object exists and matches size using head_object."""
    try:
        resp = s3_client.head_object(Bucket=bucket_name, Key=key)
        return resp.get("ContentLength") == local_size
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") in ("404", "NoSuchKey"):
            return False
        # Any other error, assume not present or retry
        return False
    except Exception:
        return False


def upload_single_file(
    s3_client,
    bucket_name: str,
    local_path: Path,
    key: str,
    max_retries: int = 3,
) -> Tuple[bool, str, int]:
    """
    Upload a single file with retries and content headers.
    Returns (success, message, file_size).
    """
    file_size = local_path.stat().st_size
    mime_type, _ = mimetypes.guess_type(str(local_path))
    content_type = mime_type if mime_type else "image/png"
    cache_control = "public, max-age=31536000, immutable"

    for attempt in range(1, max_retries + 1):
        try:
            with open(local_path, "rb") as data:
                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=key,
                    Body=data,
                    ContentType=content_type,
                    CacheControl=cache_control,
                )
            return True, "uploaded", file_size
        except Exception as e:
            if attempt == max_retries:
                return False, f"Failed after {max_retries} attempts: {e}", file_size
            time.sleep(0.5 * (2 ** (attempt - 1)))

    return False, "Unknown failure", file_size


def discover_files(target_dir: Path, subject_filter: Optional[str] = None) -> List[Tuple[Path, str]]:
    """
    Discover all PNG image crops in target_dir.
    Strictly avoids any raw_papers or PDF files.
    Returns list of (local_path, s3_key).
    """
    files: List[Tuple[Path, str]] = []
    norm_target = target_dir.resolve()

    for root, _, filenames in os.walk(norm_target):
        # Safety check: Never traverse raw_papers or .venv or git
        root_path = Path(root)
        if any(part in ("raw_papers", ".venv", ".git", "__pycache__") for part in root_path.parts):
            continue

        for fname in filenames:
            if not fname.lower().endswith(".png"):
                continue

            local_path = root_path / fname

            # Subject filter if specified (e.g. '0625')
            if subject_filter and subject_filter not in local_path.parts and not fname.startswith(subject_filter):
                continue

            # Determine key matching dataset JSON paths (e.g. 'output/0625/questions/0625_s24_qp_21_q01.png')
            try:
                rel = local_path.relative_to(norm_target)
            except ValueError:
                rel = local_path.name

            # If target_dir is output/, key is output/<rel>
            # If target_dir is frontend/public/output/, key is output/<rel>
            if norm_target.name == "output":
                key = f"output/{rel.as_posix()}"
            elif "output" in norm_target.parts:
                # e.g. frontend/public/output -> keep starting from output/
                key = f"output/{rel.as_posix()}"
            else:
                key = rel.as_posix()

            files.append((local_path, key))

    return files


def main():
    parser = argparse.ArgumentParser(description="Multi-threaded Cloudflare R2 Uploader for Cambridge Topicals")
    parser.add_argument(
        "--dir",
        type=str,
        default="output",
        help="Local directory to scan for image crops (default: output)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=32,
        help="Number of concurrent upload worker threads (default: 32)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-upload of all files even if they already exist in R2",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scan and list files without actually uploading to R2",
    )
    parser.add_argument(
        "--subject",
        type=str,
        default=None,
        help="Filter uploads by subject code (e.g., 0625, 0620, 0610, 0580)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of files to upload (useful for testing)",
    )
    args = parser.parse_args()

    # 1. Resolve root and load environment variables
    root_dir = Path(__file__).resolve().parent.parent
    env = load_env_file(root_dir / ".env")
    # Also check OS env
    account_id = os.environ.get("R2_ACCOUNT_ID") or env.get("R2_ACCOUNT_ID")
    access_key = os.environ.get("R2_ACCESS_KEY_ID") or env.get("R2_ACCESS_KEY_ID")
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY") or env.get("R2_SECRET_ACCESS_KEY")
    bucket_name = (
        os.environ.get("R2_BUCKET_NAME")
        or env.get("R2_BUCKET_NAME")
        or "cambridge-igcse-topicals"
    )

    if not (account_id and access_key and secret_key):
        print("Error: R2 credentials missing. Ensure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are set in .env")
        sys.exit(1)

    # 2. Resolve scan directory
    scan_dir = root_dir / args.dir
    if not scan_dir.exists():
        fallback_dir = root_dir / "frontend" / "public" / "output"
        if fallback_dir.exists():
            print(f"Directory '{scan_dir}' not found. Falling back to '{fallback_dir}'.")
            scan_dir = fallback_dir
        else:
            print(f"Error: Neither '{scan_dir}' nor fallback '{fallback_dir}' exists.")
            sys.exit(1)

    print(f"Scanning '{scan_dir}' for PNG crops...")
    file_items = discover_files(scan_dir, subject_filter=args.subject)
    if args.limit:
        file_items = file_items[: args.limit]

    print(f"Found {len(file_items):,} files to process.")
    if not file_items:
        print("No files to upload. Exiting.")
        return

    # Sample key check
    print(f"Sample local path: {file_items[0][0]}")
    print(f"Sample R2 key:    {file_items[0][1]}")

    if args.dry_run:
        print("\n[DRY RUN] No files will be uploaded.")
        print(f"Would upload up to {len(file_items):,} files to bucket '{bucket_name}' using {args.workers} workers.")
        return

    # 3. Initialize R2 Client
    print(f"\nConnecting to Cloudflare R2 bucket '{bucket_name}' (workers={args.workers})...")
    s3_client = get_r2_client(account_id, access_key, secret_key, max_pool=args.workers + 10)

    # 4. Check existing objects
    existing_keys: Dict[str, int] = {}
    if not args.force:
        existing_keys = fetch_existing_r2_keys(s3_client, bucket_name, prefix="output/")
        print(f"Found {len(existing_keys):,} existing objects in bucket.")

    # Filter out files that already exist and have matching size
    to_upload: List[Tuple[Path, str]] = []
    skipped_count = 0

    for local_path, key in file_items:
        local_size = local_path.stat().st_size
        if not args.force and key in existing_keys:
            if existing_keys[key] == local_size:
                skipped_count += 1
                continue
        to_upload.append((local_path, key))

    print(f"Already synced: {skipped_count:,} files.")
    print(f"To upload:      {len(to_upload):,} files.")

    if not to_upload:
        print("All files are up to date in Cloudflare R2!")
        return

    # 5. Multi-threaded upload execution
    start_time = time.time()
    uploaded_count = 0
    total_bytes = 0
    error_list: List[Tuple[str, str]] = []

    progress_bar = tqdm(
        total=len(to_upload),
        desc="Uploading to R2",
        unit="file",
        dynamic_ncols=True,
    )

    def worker_task(item: Tuple[Path, str]):
        path, key = item
        return upload_single_file(s3_client, bucket_name, path, key)

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(worker_task, item): item for item in to_upload}
        for future in concurrent.futures.as_completed(futures):
            item = futures[future]
            try:
                success, msg, size = future.result()
                if success:
                    uploaded_count += 1
                    total_bytes += size
                else:
                    error_list.append((item[1], msg))
            except Exception as exc:
                error_list.append((item[1], str(exc)))
            finally:
                progress_bar.update(1)

    progress_bar.close()
    elapsed = time.time() - start_time
    mb_uploaded = total_bytes / (1024 * 1024)
    speed = mb_uploaded / elapsed if elapsed > 0 else 0

    print("\n" + "=" * 55)
    print("Cloudflare R2 Sync Summary")
    print("=" * 55)
    print(f"Total Discovered: {len(file_items):,} files")
    print(f"Already Synced:   {skipped_count:,} files")
    print(f"Uploaded:         {uploaded_count:,} files ({mb_uploaded:.2f} MB)")
    print(f"Errors:           {len(error_list):,} files")
    print(f"Time Elapsed:     {elapsed:.1f}s ({speed:.2f} MB/s)")
    print("=" * 55)

    if error_list:
        print(f"\nTop 10 Errors:")
        for k, err in error_list[:10]:
            print(f" - {k}: {err}")


if __name__ == "__main__":
    main()

import os, sys, shutil
sys.path.insert(0, os.path.abspath("."))
from pipeline.batch_scanner import discover_paper_pairs
from pipeline.ms_matcher_physics import match_physics_mark_scheme
from pipeline.ms_matcher_chemistry import match_chemistry_mark_scheme
from pipeline.ms_matcher_biology import match_biology_mark_scheme
from pipeline.ms_matcher_math import match_math_mark_scheme

matchers = {
    '0610': (match_biology_mark_scheme, "output/0610/mark_schemes"),
    '0620': (match_chemistry_mark_scheme, "output/0620/mark_schemes"),
    '0625': (match_physics_mark_scheme, "output/0625/mark_schemes"),
    '0580': (match_math_mark_scheme, "output/0580/mark_schemes"),
}

target_ids = ['0610_s21_31', '0610_s21_33', '0610_s24_63', '0620_w25_33', '0625_s19_61', '0580_w19_41']

for sub in ['0610', '0620', '0625', '0580']:
    pairs = discover_paper_pairs(f'pipeline/raw_papers/{sub}', sub)
    for p in pairs:
        if p['base_id'] in target_ids:
            fn, out_dir = matchers[sub]
            print(f"Matching {sub}: {p['base_id']} -> {p['ms_path']}")
            res = fn(p['ms_path'], output_dir=out_dir)
            if isinstance(res, tuple):
                res = res[0]
            print(f"  Matched {len(res)} crops: {sorted([k for k in res.keys() if isinstance(k, str)])[:6]}...")

# Sync all output dirs to frontend/public/output
for sub in ['0580', '0625', '0620', '0610']:
    src_out = os.path.join("output", sub)
    dst_out = os.path.join("frontend", "public", "output", sub)
    if os.path.exists(src_out):
        os.makedirs(dst_out, exist_ok=True)
        for folder in ["questions", "mark_schemes"]:
            s = os.path.join(src_out, folder)
            d = os.path.join(dst_out, folder)
            if os.path.exists(s):
                shutil.copytree(s, d, dirs_exist_ok=True)
        print(f"Synced {sub} to frontend/public/output/{sub}")

print("Sync complete!")

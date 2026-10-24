import re

def update_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Normalize CRLF for replacement matching
    is_crlf = '\r\n' in content
    norm_content = content.replace('\r\n', '\n')
    
    for old, new in replacements:
        norm_old = old.replace('\r\n', '\n')
        norm_new = new.replace('\r\n', '\n')
        if norm_old not in norm_content:
            raise ValueError(f"Pattern not found in {path}:\n{repr(norm_old[:100])}")
        norm_content = norm_content.replace(norm_old, norm_new, 1)
        print(f"Applied replacement in {path}")
        
    if is_crlf:
        final_content = norm_content.replace('\n', '\r\n')
    else:
        final_content = norm_content
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(final_content)

# 1. Update extract_physics.py, extract_chemistry.py, extract_biology.py
# Fix continuation page barcode stripping (effective_top = HEADER_SAFE_Y if is_continuation else CONTINUATION_SAFE_TOP)
ext_replacements = [
    (
        '''        effective_top = CONTINUATION_SAFE_TOP
        y_top_limit = max(effective_top, y_min - 4.0)''',
        '''        effective_top = HEADER_SAFE_Y if is_continuation else CONTINUATION_SAFE_TOP
        y_top_limit = max(effective_top, (HEADER_SAFE_Y if is_continuation else y_min) - 4.0)'''
    ),
    (
        '''            if b[1] < CONTINUATION_SAFE_TOP or (b[3] <= 60.0 and re.match(r"^\\d{1,2}$", txt)):
                continue''',
        '''            if b[1] < effective_top or (b[3] <= 60.0 and re.match(r"^\\d{1,2}$", txt)):
                continue'''
    ),
    (
        '''        # 2. Vector drawings - globally discard any drawing with rect.y0 < HEADER_SAFE_Y across ALL pages
        drawings = [d for d in page.get_drawings() if d["rect"].y0 >= HEADER_SAFE_Y]''',
        '''        # 2. Vector drawings - globally discard any drawing with rect.y0 < (HEADER_SAFE_Y if is_continuation else PAGE_CONTENT_TOP)
        min_draw_y = HEADER_SAFE_Y if is_continuation else PAGE_CONTENT_TOP
        drawings = [d for d in page.get_drawings() if d["rect"].y0 >= min_draw_y]'''
    ),
    (
        '''        # 3. Images - globally discard any image with ibox.y0 < HEADER_SAFE_Y across ALL pages
        try:
            for img_info in page.get_image_info(xrefs=True):
                ibox = fitz.Rect(img_info["bbox"])
                if ibox.y0 < HEADER_SAFE_Y:
                    continue''',
        '''        # 3. Images - discard header barcodes
        min_img_y = HEADER_SAFE_Y if is_continuation else PAGE_CONTENT_TOP
        try:
            for img_info in page.get_image_info(xrefs=True):
                ibox = fitz.Rect(img_info["bbox"])
                if ibox.y0 < min_img_y:
                    continue'''
    )
]

for p in ['pipeline/extract_physics.py', 'pipeline/extract_chemistry.py', 'pipeline/extract_biology.py']:
    update_file(p, ext_replacements)

print("Updated extractors successfully!")

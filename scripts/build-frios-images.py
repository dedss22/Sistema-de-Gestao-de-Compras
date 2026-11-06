import os
import sys
from PIL import Image, ImageOps

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST_DIR = os.path.join(BASE_DIR, 'public', 'assets', 'itens')
SRC_DIR = os.path.join(BASE_DIR, 'temp-frios')

specs = [
    {
        'id': 'salame-italiano',
        'src': 'salame-italiano.jpg',
        'fit': True,
        'bg': (255, 255, 255)
    },
    {
        'id': 'peito-peru',
        'src': 'peito-peru.jpg',
        'fit': False, # It is a cutout on white; pad on 800x600 white canvas
        'bg': (255, 255, 255)
    },
    {
        'id': 'presunto-parma',
        'src': 'presunto-parma.jpg',
        'fit': True,
        'bg': (255, 255, 255)
    },
    {
        'id': 'copa-fatiada',
        'src': 'copa-fatiada.jpg',
        'fit': True,
        'bg': (255, 255, 255)
    },
    {
        'id': 'lombo-defumado',
        'src': 'lombo-defumado.jpg',
        'fit': False, # Wide image on white, pad on 800x600 white canvas
        'bg': (255, 255, 255)
    },
    {
        'id': 'mortadela-defumada',
        'src': 'mortadela-defumada-alt.jpg',
        'fit': False, # Studio shot on white, pad on 800x600 white canvas
        'bg': (255, 255, 255)
    },
    {
        'id': 'queijo-gorgonzola',
        'src': 'queijo-gorgonzola.jpg',
        'fit': True,
        'bg': (255, 255, 255)
    },
    {
        'id': 'queijo-brie',
        'src': 'camembert-cheese.jpg',
        'fit': True,
        'bg': (255, 255, 255)
    },
    {
        'id': 'queijo-gouda',
        'src': 'cheese-40.jpg',
        'fit': True,
        'bg': (255, 255, 255)
    },
    {
        'id': 'queijo-provolone',
        'src': 'queijo-provolone.jpg',
        'fit': True,
        'bg': (255, 255, 255)
    },
    {
        'id': 'queijo-parmesao-pedaco',
        'src': 'queijo-parmesao-pedaco.jpg',
        'fit': True,
        'bg': (255, 255, 255)
    }
]

def make_padded(im, target_w=800, target_h=600, bg_color=(255, 255, 255)):
    # Keep aspect ratio with maximum padding inside 800x600
    im_ratio = im.width / im.height
    target_ratio = target_w / target_h
    
    # Scale to fit with slight margin
    margin = 0.92
    if im_ratio > target_ratio:
        new_w = int(target_w * margin)
        new_h = int(new_w / im_ratio)
    else:
        new_h = int(target_h * margin)
        new_w = int(new_h * im_ratio)
        
    resized = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (target_w, target_h), bg_color)
    offset_x = (target_w - new_w) // 2
    offset_y = (target_h - new_h) // 2
    if resized.mode == "RGBA":
        canvas.paste(resized, (offset_x, offset_y), mask=resized.split()[3])
    else:
        canvas.paste(resized, (offset_x, offset_y))
    return canvas

for item in specs:
    src_file = os.path.join(SRC_DIR, item['src'])
    item_id = item['id']
    if not os.path.exists(src_file):
        print(f"ERROR: missing {src_file}")
        continue
    
    with Image.open(src_file) as im:
        if im.mode in ("P", "PA", "LA", "L"):
            im = im.convert("RGBA" if "A" in im.mode else "RGB")
        elif im.mode == "CMYK":
            im = im.convert("RGB")
        im = ImageOps.exif_transpose(im)
        
        if item.get('fit', True):
            processed = ImageOps.fit(im, (800, 600), method=Image.Resampling.LANCZOS)
        else:
            processed = make_padded(im, 800, 600, item.get('bg', (255, 255, 255)))
            
        png_path = os.path.join(DEST_DIR, f"{item_id}.png")
        jpg_path = os.path.join(DEST_DIR, f"{item_id}.jpg")
        
        processed.save(png_path, "PNG", optimize=True)
        processed.convert("RGB").save(jpg_path, "JPEG", quality=92, optimize=True)
        
        png_size = os.path.getsize(png_path)
        jpg_size = os.path.getsize(jpg_path)
        print(f"OK {item_id:25} -> PNG: {png_size} bytes, JPG: {jpg_size} bytes")

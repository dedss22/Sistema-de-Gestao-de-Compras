import sys
import os
from PIL import Image, ImageOps

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

def process_image(src_path, dest_dir, item_id):
    try:
        with Image.open(src_path) as im:
            # Convert palette/grayscale/CMYK to RGB/RGBA
            if im.mode in ("P", "PA", "LA", "L"):
                im = im.convert("RGBA" if "A" in im.mode else "RGB")
            elif im.mode == "CMYK":
                im = im.convert("RGB")
            
            # Handle orientation from EXIF if present
            im = ImageOps.exif_transpose(im)
            
            # Crop to 800x600 using LANCZOS
            fitted = ImageOps.fit(im, (800, 600), method=Image.Resampling.LANCZOS)
            
            # Save PNG
            png_path = os.path.join(dest_dir, f"{item_id}.png")
            # If RGBA, save directly; if RGB, save directly
            fitted.save(png_path, "PNG", optimize=True)
            
            # Save JPG (must be RGB)
            jpg_path = os.path.join(dest_dir, f"{item_id}.jpg")
            if fitted.mode == "RGBA":
                rgb_bg = Image.new("RGB", fitted.size, (255, 255, 255))
                rgb_bg.paste(fitted, mask=fitted.split()[3])
                rgb_bg.save(jpg_path, "JPEG", quality=92, optimize=True)
            else:
                fitted.convert("RGB").save(jpg_path, "JPEG", quality=92, optimize=True)
            
            print(f"PROCESSED {item_id}: 800x600 saved to PNG & JPG")
            return True
    except Exception as e:
        print(f"ERROR {item_id} from {src_path}: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python process-images.py <src_file> <dest_dir> <item_id>")
        sys.exit(1)
    src = sys.argv[1]
    dest = sys.argv[2]
    item_id = sys.argv[3]
    success = process_image(src, dest, item_id)
    sys.exit(0 if success else 1)

"""
Genera thumbnails de 440x300px para las fotos del photo strip.
Uso: python generate_thumbs.py
"""
import os
from PIL import Image

SRC = "static/images/fotos"
DST = "static/images/fotos/thumbs"
SIZE = (440, 300)
QUALITY = 75

os.makedirs(DST, exist_ok=True)

exts = ('.webp', '.jpg', '.jpeg', '.png')
fotos = [f for f in os.listdir(SRC) if f.lower().endswith(exts)]

for nombre in fotos:
    src_path = os.path.join(SRC, nombre)
    dst_name = os.path.splitext(nombre)[0] + ".webp"
    dst_path = os.path.join(DST, dst_name)

    if os.path.exists(dst_path):
        print(f"  ya existe: {dst_name}")
        continue

    with Image.open(src_path) as img:
        img = img.convert("RGB")
        img.thumbnail(SIZE, Image.LANCZOS)
        img.save(dst_path, "WEBP", quality=QUALITY, method=6)
        src_kb = os.path.getsize(src_path) // 1024
        dst_kb = os.path.getsize(dst_path) // 1024
        print(f"  {nombre} {src_kb}KB → {dst_name} {dst_kb}KB")

print("\nListo.")

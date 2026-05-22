# Cambiar jpg o png a webp
import os
from PIL import Image

for root, dirs, files in os.walk('static/images/fotos'):
    for file in files:
        if file.endswith('.webp'):
            continue
        if file.endswith('.jpg'):
            img_path = os.path.join(root, file)
            img = Image.open(img_path)
            img.save(img_path.replace('.jpg', '.webp'))
        if file.endswith('.png'):
            img_path = os.path.join(root, file)
            img = Image.open(img_path)
            img.save(img_path.replace('.png', '.webp'))
        print(f"Cambio exitoso en {file}")
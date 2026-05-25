import requests
import os
from db import init_sigle_connection

# Carpeta donde se guardarán las fotos en tu repo
DEST_FOLDER = "static/images/events"
if not os.path.exists(DEST_FOLDER):
    os.makedirs(DEST_FOLDER)

def get_drive_ids():
    conn = init_sigle_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT id, image FROM events ORDER BY date ASC;"
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return dict(rows)


def download_drive_image(file_id, filename):
    # URL directa de descarga de Drive
    url = f'https://drive.google.com/uc?export=download&id={file_id}'
    response = requests.get(url)
    if response.status_code == 200:
        with open(os.path.join(DEST_FOLDER, filename), 'wb') as f:
            f.write(response.content)
        print(f"✅ Descargada: {filename}")
    else:
        print(f"❌ Error en {filename}")

if __name__ == "__main__":
    for name, drive_id in get_drive_ids().items():
        if os.path.exists(os.path.join(DEST_FOLDER, f"{name}.webp")):
            print(f"  ya existe: {name}.webp")
            continue
        download_drive_image(drive_id, f"{name}.webp")

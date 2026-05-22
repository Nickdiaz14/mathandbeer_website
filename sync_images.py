import requests
import os
from db import init_sigle_connection

# ── Eventos: imágenes de portada desde BD ────────────────────────────────────
DEST_FOLDER = "static/images/events"
os.makedirs(DEST_FOLDER, exist_ok=True)

def get_drive_ids():
    conn = init_sigle_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, image FROM events WHERE date < CURRENT_TIMESTAMP ORDER BY date ASC;"
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return dict(rows)


def download_drive_image(file_id, filename):
    url = f'https://drive.google.com/uc?export=download&id={file_id}'
    response = requests.get(url)
    if response.status_code == 200:
        with open(os.path.join(DEST_FOLDER, filename), 'wb') as f:
            f.write(response.content)
        print(f"✅ Evento descargado: {filename}")
    else:
        print(f"❌ Error en {filename}: {response.status_code}")


# ── Fotos: carpeta Drive pública, descarga recursiva ─────────────────────────
FOTOS_DEST   = "static/images/fotos"
API_KEY      = os.getenv("GOOGLE_API_KEY")
FOTOS_FOLDER = os.getenv("FOTOS_FOLDER_ID")


def _list_folder(folder_id):
    """Devuelve todos los items de una carpeta (maneja paginación)."""
    url = "https://www.googleapis.com/drive/v3/files"
    params = {
        "q": f"'{folder_id}' in parents and trashed = false",
        "fields": "nextPageToken, files(id, name, mimeType)",
        "pageSize": 1000,
        "key": API_KEY,
    }
    items = []
    while True:
        resp = requests.get(url, params=params)
        if resp.status_code != 200:
            print(f"  ⚠️  Error listando carpeta {folder_id}: {resp.status_code}")
            break
        data = resp.json()
        items.extend(data.get("files", []))
        token = data.get("nextPageToken")
        if not token:
            break
        params["pageToken"] = token
    return items


def _download_file(file_id, dest_path):
    """Descarga un archivo de Drive, maneja confirmación de archivos grandes."""
    session = requests.Session()
    url = "https://drive.google.com/uc?export=download"

    resp = session.get(url, params={"id": file_id}, stream=True)

    # Archivos grandes muestran página de confirmación
    confirm = None
    for key, val in resp.cookies.items():
        if key.startswith("download_warning"):
            confirm = val
            break

    if confirm:
        resp = session.get(url, params={"id": file_id, "confirm": confirm}, stream=True)

    if resp.status_code == 200:
        with open(dest_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=32768):
                if chunk:
                    f.write(chunk)
        return True
    return False


def _sync_recursive(folder_id, local_path):
    """Recorre una carpeta de Drive y descarga archivos nuevos, recursivamente."""
    os.makedirs(local_path, exist_ok=True)
    items = _list_folder(folder_id)

    for item in items:
        name = item["name"]
        is_folder = item["mimeType"] == "application/vnd.google-apps.folder"

        if is_folder:
            _sync_recursive(item["id"], os.path.join(local_path, name))
        else:
            dest = os.path.join(local_path, name)
            if os.path.exists(dest):
                continue  # ya descargado, no re-descarga
            print(f"  ⬇️  {os.path.relpath(dest, FOTOS_DEST)}")
            ok = _download_file(item["id"], dest)
            if not ok:
                print(f"  ❌ Falló: {name}")


def sync_fotos():
    if not API_KEY or not FOTOS_FOLDER:
        print("⚠️  GOOGLE_API_KEY o FOTOS_FOLDER_ID no configurados, omitiendo fotos.")
        return
    print("📸 Sincronizando carpeta Fotos...")
    _sync_recursive(FOTOS_FOLDER, FOTOS_DEST)
    print("✅ Fotos sincronizadas.")


# ── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Portadas de eventos
    for name, drive_id in get_drive_ids().items():
        download_drive_image(drive_id, f"{name}.webp")

    # Galería de fotos
    sync_fotos()

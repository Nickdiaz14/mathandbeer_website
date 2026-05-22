import requests
import os
import json
import io
from PIL import Image
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


# ── Fotos: carpeta Drive pública, numeración secuencial ──────────────────────
FOTOS_DEST   = "static/images/fotos"
INDEX_FILE   = os.path.join(FOTOS_DEST, "index.json")
API_KEY      = os.getenv("GOOGLE_API_KEY")
FOTOS_FOLDER = os.getenv("FOTOS_FOLDER_ID")

IMAGEN_MIMES = {
    "image/jpeg", "image/png", "image/webp",
    "image/gif", "image/bmp", "image/heic",
}


def _load_index():
    """Carga el índice {drive_id: "N.webp"} o devuelve vacío."""
    if os.path.exists(INDEX_FILE):
        with open(INDEX_FILE, "r") as f:
            return json.load(f)
    return {}


def _save_index(index):
    with open(INDEX_FILE, "w") as f:
        json.dump(index, f, indent=2)


def _list_folder(folder_id):
    """Lista todos los items de una carpeta manejando paginación."""
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


def _collect_all_images(folder_id):
    """Recorre recursivamente y devuelve lista de (id, name) de todas las imágenes."""
    images = []
    for item in _list_folder(folder_id):
        if item["mimeType"] == "application/vnd.google-apps.folder":
            images.extend(_collect_all_images(item["id"]))
        elif item["mimeType"] in IMAGEN_MIMES:
            images.append((item["id"], item["name"]))
    return images


def _fetch_bytes(file_id):
    """Descarga un archivo de Drive en memoria y devuelve los bytes."""
    session = requests.Session()
    url = "https://drive.google.com/uc?export=download"
    resp = session.get(url, params={"id": file_id}, stream=True)

    confirm = next(
        (v for k, v in resp.cookies.items() if k.startswith("download_warning")),
        None
    )
    if confirm:
        resp = session.get(url, params={"id": file_id, "confirm": confirm}, stream=True)

    if resp.status_code != 200:
        return None
    return b"".join(resp.iter_content(chunk_size=32768))


def sync_fotos():
    if not API_KEY or not FOTOS_FOLDER:
        print("⚠️  GOOGLE_API_KEY o FOTOS_FOLDER_ID no configurados, omitiendo fotos.")
        return

    os.makedirs(FOTOS_DEST, exist_ok=True)
    index = _load_index()
    next_num = max((int(v.split(".")[0]) for v in index.values()), default=0) + 1

    print("📸 Recolectando imágenes de Drive...")
    all_images = _collect_all_images(FOTOS_FOLDER)
    nuevas = [(fid, name) for fid, name in all_images if fid not in index]
    print(f"   {len(all_images)} imágenes totales · {len(nuevas)} nuevas")

    for file_id, original_name in nuevas:
        dest_name = f"{next_num}.webp"
        dest_path = os.path.join(FOTOS_DEST, dest_name)
        print(f"  ⬇️  {original_name} → {dest_name}")

        raw = _fetch_bytes(file_id)
        if raw is None:
            print(f"  ❌ No se pudo descargar: {original_name}")
            continue

        try:
            img = Image.open(io.BytesIO(raw)).convert("RGB")
            img.save(dest_path, "WEBP", quality=85)
            index[file_id] = dest_name
            next_num += 1
        except Exception as e:
            print(f"  ❌ Error convirtiendo {original_name}: {e}")

    _save_index(index)
    print("✅ Fotos sincronizadas.")


# ── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Portadas de eventos
    for name, drive_id in get_drive_ids().items():
        download_drive_image(drive_id, f"{name}.webp")

    # Galería de fotos
    sync_fotos()

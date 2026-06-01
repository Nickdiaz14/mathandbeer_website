# Math & Beer — Plataforma de Divulgación Matemática 🍺🔢

Plataforma web de **divulgación matemática** para la comunidad **Math & Beer** en Colombia. Combina juegos interactivos de lógica y matemáticas con gestión de eventos, leaderboards globales y reto diario.

## 🚀 Características

### Juegos interactivos
- **0h-h1** — Rellena cuadrículas con rojos y azules respetando restricciones de balance y unicidad (4×4 a 10×10)
- **0h-h1 Contrarreloj** — Variante por tiempo del 0h-h1
- **Salto Real** — Mueve un caballo de ajedrez para capturar 5 celdas objetivo en el menor número de movimientos
- **Secuenzo** — Memoriza y replica patrones de color antes de que se agote el tiempo (Unicolor 6×6 / Bicolor 5×5)
- **CuentaManía** — Selecciona números en orden ascendente lo más rápido posible (S/M/L)
- **0h-n0** — Puzzle de restricciones numéricas sobre cuadrículas (4×4 / 5×5)
- **Nerdle** — Adivina la ecuación matemática oculta (Mini / Estándar / Maxi)

### Comunidad y eventos
- **Reto Diario** — Un juego diferente cada día con leaderboard propio y sistema de rachas
- **Leaderboards globales** — Rankings por juego con posición personal
- **Perfil de usuario** — Estadísticas, récords, badges y actividad
- **Gestión de eventos** — RSVP, comentarios, reacciones (brindis) y preguntas para ponentes
- **Newsletter** — Suscripción para avisos de próximas charlas
- **Blog** — Artículos de divulgación matemática

### Diseño
- Interfaz glassmorphism con gradiente morado/negro, acento dorado y cyan
- Partículas matemáticas flotantes (∑ π ∞ √ …) en el hero
- Divisores SVG wave entre secciones
- Modales de selección de modo/tamaño con estilo propio
- Animaciones de entrada, skeleton loading y countdown antes de cada juego

## 🛠️ Stack

| Capa | Tecnología |
|---|---|
| Backend | Python 3 · Flask 3.1 · Gunicorn |
| Base de datos | PostgreSQL · psycopg2 (connection pool) |
| Frontend | HTML5 · CSS3 · JavaScript (vanilla) |
| UI | Bootstrap 5.3 · Font Awesome 6 · Inter (Google Fonts) |
| Analytics | Google Tag Manager |
| Deploy | Render.com |

## 📋 Requisitos previos

- Python 3.10+
- PostgreSQL

## 💻 Instalación local

```bash
# 1. Clonar
git clone https://github.com/Nickdiaz14/mathandbeer_website.git
cd mathandbeer_website

# 2. Entorno virtual
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# 3. Dependencias
pip install -r requirements.txt

# 4. Variables de entorno (.env)
DB_HOST=localhost
DB_NAME=nombre_bd
DB_USER=usuario
DB_PASSWORD=contraseña
DB_PORT=5432

# 5. Ejecutar
python main.py
```

El servidor queda en `http://localhost:5000`.

## 📁 Estructura principal

```
├── app.py                  # App factory y registro de blueprints
├── main.py                 # Entry point
├── db.py                   # Pool de conexiones PostgreSQL
├── routes/
│   ├── pages.py            # Rutas HTML
│   └── api.py              # API REST (juegos, leaderboards, daily, eventos)
├── templates/              # Jinja2 templates
├── static/
│   ├── css/                # Estilos por sección/juego
│   ├── scripts/            # JS por juego + utilidades compartidas
│   ├── boards/             # Tableros pre-generados (.txt)
│   └── json/               # Reglas, equipo, partners, artículos
└── requirements.txt
```

---
Construido para que las matemáticas se disfruten con buena compañía. 🍻

# Math & Beer — Plataforma de Divulgación Matemática 🍺🔢

Plataforma web de **divulgación matemática** para la comunidad **Math & Beer** en Colombia. Combina juegos interactivos de lógica y matemáticas con gestión de eventos, leaderboards globales, reto diario y tienda oficial.

## 🚀 Características

### Juegos interactivos
- **0h-h1** — Rellena cuadrículas con rojos y azules respetando restricciones de balance y unicidad (4×4 a 10×10).
- **0h-h1 Contrarreloj** — Variante por tiempo del 0h-h1.
- **Salto Real** — Mueve un caballo de ajedrez para capturar celdas objetivo en el menor número de movimientos (Modo Normal y Contrarreloj).
- **KenKen** — Completa la cuadrícula con números sin repetir en filas/columnas satisfaciendo los objetivos aritméticos de cada jaula (4×4 / 5×5).
- **Secuenzo** — Memoriza y replica patrones de color antes de que se agote el tiempo (Unicolor 6×6 / Bicolor 5×5).
- **CuentaManía** — Selecciona números en orden ascendente lo más rápido posible (S/M/L).
- **0h-n0** — Puzzle de restricciones numéricas sobre cuadrículas (4×4 / 5×5).
- **Nerdle** — Adivina la ecuación matemática oculta (Mini / Estándar / Maxi).

### Comunidad, Eventos y Tienda
- **Reto Diario** — Un juego diferente cada día con leaderboard propio y sistema de rachas.
- **Leaderboards globales** — Rankings por juego con posición personal.
- **Perfil de usuario** — Estadísticas, récords, badges y actividad.
- **Gestión de eventos y RSVP** — Asistencia, comentarios, reacciones (brindis) y preguntas para ponentes.
- **Math & Beer Store** — Tienda oficial de productos y merchandising de la comunidad.
- **Newsletter** — Suscripción para avisos de próximas charlas.

### Diseño y UX
- Interfaz glassmorphism con gradiente morado/negro, acento dorado y cyan.
- Partículas matemáticas flotantes (`∑`, `π`, `∞`, `√`…) en la sección Hero.
- Divisores SVG wave entre secciones.
- Modales de selección de modo/tamaño con diseño customizado.
- Animaciones de entrada, skeleton loading y countdown antes de cada juego.

## 🛠️ Stack

| Capa | Tecnología |
|---|---|
| **Backend** | Python 3 · Flask 3.1 · Gunicorn |
| **Base de datos** | PostgreSQL · psycopg2 (connection pool) |
| **Frontend** | HTML5 · CSS3 · JavaScript (Vanilla) |
| **UI Frameworks** | Bootstrap 5.3 · Font Awesome 6 · Google Fonts (Inter) |
| **Analytics** | Google Tag Manager |
| **Despliegue** | Render.com / Supabase Postgres |

## 📋 Requisitos previos

- Python 3.10+
- PostgreSQL (local o remoto como Supabase)

## 💻 Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/Nickdiaz14/mathandbeer_website.git
cd mathandbeer_website

# 2. Crear y activar entorno virtual
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar variables de entorno (.env)
DB_HOST=localhost
DB_NAME=nombre_bd
DB_USER=usuario
DB_PASSWORD=contraseña
DB_PORT=5432

# 5. Ejecutar servidor local
python main.py
```

El servidor estará disponible en `http://localhost:5000` (o HTTPS en `https://localhost:5000` si ejecutas `app.py`).

## 📁 Estructura del proyecto

```
├── app.py                  # App factory, configuración de headers y registro de blueprints
├── main.py                 # Punto de entrada principal para ejecutar la aplicación
├── db.py                   # Administrador del pool de conexiones PostgreSQL
├── routes/                 # Módulos de rutas y endpoints de la aplicación
│   ├── pages.py            # Rutas de vistas HTML (Inicio, Juegos, Blog, Eventos, etc.)
│   ├── games.py            # API REST para juegos y guardado de puntuaciones
│   ├── daily.py            # API REST del reto diario y cálculo de rachas
│   ├── events.py           # API REST para eventos, comentarios y preguntas
│   ├── attendance.py       # API REST para confirmación de asistencia (RSVP)
│   ├── store.py            # API REST y vistas de Math & Beer Store (productos)
│   └── users.py            # API REST para gestión de usuarios, perfiles y récords
├── templates/              # Plantillas HTML con Jinja2
├── static/
│   ├── css/                # Hojas de estilo por sección y por juego
│   ├── scripts/            # Lógica cliente JS por juego y utilidades compartidas
│   ├── boards/             # Tableros pre-generados (.txt)
│   ├── json/               # Datos estáticos (reglas, equipo, partners, artículos)
│   └── store/              # Imágenes de productos de la tienda
├── sync_images.py          # Script utilitario para sincronizar imágenes de productos
├── generate_thumbs.py      # Script utilitario para generar miniaturas de productos
├── boards.py               # Generación y validación de tableros de juegos
└── requirements.txt        # Dependencias de Python
```

---

Construido para que las matemáticas se disfruten con buena compañía. 🍻

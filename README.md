# Math and Beer Games 🍻🎲

Una aplicación web desarrollada en **Python con Flask** que ofrece una colección de juegos interactivos de lógica y matemáticas (como `0h_h1`, `Knight`, `Secuenzo` y `Cuentamania`). Además, incluye funcionalidades como tablas de clasificación globales, registro de usuarios, perfiles y asistencias a distintos eventos.

## 🚀 Características Principales

*   **Mini-Juegos Interactivos:** Disfruta de juegos como 0h h1, Secuenzo, Knight, Cuentamania, modalidades aleatorias y contrarreloj.
*   **Leaderboards (Ranking):** Sistema de records con tablas de clasificación dependiendo del tipo de juego (por puntos o por tiempo).
*   **Gestión de Eventos y Asistencias:** Sistema para registrar datos de los jugadores y sus asistencias a próximos eventos.
*   **Integración con Base de Datos:** Los registros de jugadores, líderes, y puntajes están centralizados de manera segura usando PostgreSQL.

## 🛠️ Tecnologías Utilizadas

*   **Backend:** Python y Flask
*   **Base de Datos:** PostgreSQL (con librería `psycopg2`)
*   **Frontend:** HTML5, CSS3, JavaScript. 
*   **Otros:** Variables de Entorno (`python-dotenv`), Servidor SSL Adhoc, y Json para configuración.

## 📋 Prerrequisitos

Para ejecutar el proyecto necesitas tener instalados en tu computadora:
*   [Python 3.x](https://www.python.org/downloads/)
*   Un servidor o instancia de PostgreSQL.

## 💻 Instalación y Ejecución

Sigue estos pasos para correr el proyecto localmente de forma rápida:

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/Nickdiaz14/math_and_beer_games.git
   cd math_and_beer_games
   ```

2. **Crea y activa un entorno virtual (recomendado):**
   ```bash
   python -m venv venv
   # Activa el entorno virtual en Windows:
   venv\Scripts\activate
   # Activa el entorno virtual en Linux/Mac:
   source venv/bin/activate
   ```

3. **Instala las dependencias necesarias:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configura el Entorno (.env):**
   Crea un archivo llamado `.env` en la raíz del proyecto. Este archivo debe contener la configuración a tu base de datos:
   ```env
   DB_HOST=localhost
   DB_NAME=nombre_de_tu_bd
   DB_USER=tu_usuario
   DB_PASSWORD=tu_contraseña
   ```

5. **Inicia el servidor Flask:**
   ```bash
   python app.py
   ```

   El sitio estará disponible gracias al servidor Flask en el archivo host `0.0.0.0` y el puerto `:5000` (`https://localhost:5000`).

---
✨ Construido para ejercitar la mente, disfrutar y competir.# mathandbeer_website

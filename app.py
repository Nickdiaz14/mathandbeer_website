from flask import Flask, request, render_template, jsonify
from dotenv import load_dotenv
from db import init_db_pool

from routes.pages import pages_bp
from routes.games import games_bp
from routes.daily import daily_bp
from routes.users import users_bp
from routes.events import events_bp
from routes.attendance import attendance_bp
from routes.store import store_bp

def create_app():
    load_dotenv()

    # 1. Start Postgres Connection Pool (Thread-safe)
    init_db_pool()

    # 2. Setup Flask
    app = Flask(__name__)

    @app.after_request
    def add_header(response):
        content_type = response.headers.get('Content-Type', '')
        # Si la respuesta es un archivo HTML, evitamos que se guarde en caché
        if content_type.startswith('text/html'):
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        # Caché estática óptima para imágenes, fuentes, css y js
        elif any(content_type.startswith(t) for t in ['image/', 'font/', 'text/css', 'application/javascript']):
            if 'Cache-Control' not in response.headers:
                response.headers['Cache-Control'] = 'public, max-age=2592000' # 30 días
        return response

    # 3. Manejadores de errores personalizados
    @app.errorhandler(404)
    def not_found_error(error):
        if request.path.startswith('/api/') or request.is_json:
            return jsonify({'error': 'Recurso no encontrado', 'status': 404}), 404
        return render_template(
            'error.html',
            error_code=404,
            error_title='Página no encontrada',
            error_message='Parece que este teorema aún no ha sido demostrado o la página que buscas cambió de lugar.'
        ), 404

    @app.errorhandler(500)
    def internal_error(error):
        if request.path.startswith('/api/') or request.is_json:
            return jsonify({'error': 'Error interno del servidor', 'status': 500}), 500
        return render_template(
            'error.html',
            error_code=500,
            error_title='Error en el servidor',
            error_message='Ocurrió un error inesperado al procesar la solicitud. Nuestro equipo ya está al tanto.'
        ), 500

    # 4. Register All Application Routes
    app.register_blueprint(pages_bp)
    app.register_blueprint(games_bp)
    app.register_blueprint(daily_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(store_bp)

    return app

# Optional standalone runner (main.py is preferred)
if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000, ssl_context='adhoc')

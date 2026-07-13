from flask import Flask, request
from dotenv import load_dotenv
from db import init_db_pool

from routes.pages import pages_bp
from routes.games import games_bp
from routes.daily import daily_bp
from routes.users import users_bp
from routes.events import events_bp
from routes.attendance import attendance_bp
from routes.store import store_bp
# Auth blueprint removed (email auth no longer used)

def create_app():
    load_dotenv()

    # 1. Start Postgres Connection Pool (Huge performance boost)
    init_db_pool()

    # 2. Setup Flask
    app = Flask(__name__)
    @app.after_request
    def add_header(response):
        # Si la respuesta es un archivo HTML, evitamos que se guarde en caché
        if response.headers.get('Content-Type', '').startswith('text/html'):
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        return response

    # 3. Register All Application Routes
    app.register_blueprint(pages_bp)
    app.register_blueprint(games_bp)
    app.register_blueprint(daily_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(store_bp)
    # Blueprint registration removed

    return app

# Optional standalone runner (main.py is preferred)
if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000, ssl_context='adhoc')
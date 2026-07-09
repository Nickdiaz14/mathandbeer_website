from flask import Flask
from dotenv import load_dotenv
from db import init_db_pool

from routes.pages import pages_bp
from routes.games import games_bp
from routes.daily import daily_bp
from routes.users import users_bp
from routes.events import events_bp
from routes.attendance import attendance_bp
# Auth blueprint removed (email auth no longer used)

def create_app():
    load_dotenv()

    # 1. Start Postgres Connection Pool (Huge performance boost)
    init_db_pool()

    # 2. Setup Flask
    app = Flask(__name__)

    # 3. Register All Application Routes
    app.register_blueprint(pages_bp)
    app.register_blueprint(games_bp)
    app.register_blueprint(daily_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(attendance_bp)
    # Blueprint registration removed

    return app

# Optional standalone runner (main.py is preferred)
if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000, ssl_context='adhoc')
from flask import Flask
from dotenv import load_dotenv
from db import init_db_pool

# Centralized Blueprints
from routes.pages import pages_bp
from routes.api import api_bp

def create_app():
    load_dotenv()
    
    # 1. Start Postgres Connection Pool (Huge performance boost)
    init_db_pool()

    # 2. Setup Flask
    app = Flask(__name__)
    
    # 3. Register All Application Routes
    app.register_blueprint(pages_bp)
    app.register_blueprint(api_bp)

    return app

# Optional standalone runner (main.py is preferred)
if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000, ssl_context='adhoc')
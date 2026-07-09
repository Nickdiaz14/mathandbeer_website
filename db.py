import os
import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv

load_dotenv()

_db_pool = None

def init_sigle_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        port=os.getenv("DB_PORT", "5432"), 
        sslmode="require" 
    )

def init_db_pool():
    """Inicializa el pool de conexiones de la App (Min 1, Max 20)."""
    global _db_pool
    if _db_pool is None:
        try:
            _db_pool = psycopg2.pool.SimpleConnectionPool(
                1, 40,
                host=os.getenv("DB_HOST"),
                database=os.getenv("DB_NAME"),
                user=os.getenv("DB_USER"),
                password=os.getenv("DB_PASSWORD"),
                port="5432"
            )
            print("[OK] Postgres Connection Pool Creado Exitosamente")
            _setup_schema()
        except Exception as e:
            print("[ERROR] Error al crear DB Pool:", str(e))

def _setup_schema():
    """Crea las tablas necesarias para las mejoras si no existen."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        
        # Tabla de credenciales removida (autenticación por email eliminada)
        # Se omite la creación de user_credentials.

        
        # Streak freezes disponibles
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS streak_freezes (
                userid TEXT PRIMARY KEY REFERENCES nickname(userid) ON DELETE CASCADE,
                freezes_count INT NOT NULL DEFAULT 0 CHECK (freezes_count BETWEEN 0 AND 2)
            );
        """)
        
        # Streak freezes usados
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS streak_freezes_used (
                id SERIAL PRIMARY KEY,
                userid TEXT NOT NULL REFERENCES nickname(userid) ON DELETE CASCADE,
                freeze_date DATE NOT NULL,
                UNIQUE (userid, freeze_date)
            );
        """)
        
        conn.commit()
        print("[OK] Base de datos estructurada con éxito.")
    except Exception as e:
        conn.rollback()
        print("[ERROR] Error configurando el esquema de BD:", e)
    finally:
        cursor.close()
        release_connection(conn)

def get_connection():
    """Obtiene una conexión limpia y rápida del pool."""
    if _db_pool is None:
        init_db_pool()
    if _db_pool:
        return _db_pool.getconn()
    raise Exception("El Database Connection Pool no existe ni pudo inicializarse")

def release_connection(conn):
    """Devuelve la conexión al pool en lugar de cerrarla."""
    if _db_pool and conn:
        try:
            _db_pool.putconn(conn)
        except Exception as e:
            print("Error al retornar conexión:", str(e))

def close_all_connections():
    """Cierra todo. Principalmente útil al apagar el servidor."""
    if _db_pool:
        _db_pool.closeall()

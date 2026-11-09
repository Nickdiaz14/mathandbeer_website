import os
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

_db_pool = None

def init_single_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        port=os.getenv("DB_PORT", "5432"),
        sslmode="require"
    )

def init_db_pool():
    """Inicializa el pool de conexiones thread-safe de la App (Min 1, Max 40)."""
    global _db_pool
    if _db_pool is None:
        try:
            _db_pool = psycopg2.pool.ThreadedConnectionPool(
                1, 40,
                host=os.getenv("DB_HOST"),
                database=os.getenv("DB_NAME"),
                user=os.getenv("DB_USER"),
                password=os.getenv("DB_PASSWORD"),
                port=os.getenv("DB_PORT", "5432")
            )
            print("[OK] Postgres ThreadedConnectionPool Creado Exitosamente")
        except Exception as e:
            print("[ERROR] Error al crear DB Pool:", str(e))

def get_connection():
    """Obtiene una conexión limpia del pool."""
    if _db_pool is None:
        init_db_pool()
    if _db_pool:
        return _db_pool.getconn()
    raise Exception("El Database Connection Pool no existe ni pudo inicializarse")

def release_connection(conn):
    """Devuelve la conexión al pool en lugar de cerrarla, garantizando rollback si quedó sucia."""
    if _db_pool and conn:
        try:
            # Si quedó alguna transacción abierta o fallida, se limpia antes de reutilizar
            if hasattr(conn, 'status') and conn.status != psycopg2.extensions.STATUS_READY:
                conn.rollback()
        except Exception as rollback_err:
            print("Error al hacer rollback antes de devolver conexión:", str(rollback_err))
        try:
            _db_pool.putconn(conn)
        except Exception as e:
            print("Error al retornar conexión:", str(e))

@contextmanager
def get_db():
    """Context manager para manejar conexiones de forma segura y automática."""
    conn = get_connection()
    try:
        yield conn
    except Exception:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        raise
    finally:
        release_connection(conn)

def close_all_connections():
    """Cierra todo. Principalmente útil al apagar el servidor."""
    global _db_pool
    if _db_pool:
        _db_pool.closeall()
        _db_pool = None

from flask import Blueprint, request, jsonify
from datetime import datetime
import pytz
from db import get_connection, release_connection

attendance_bp = Blueprint('attendance', __name__)


@attendance_bp.route('/attendance', methods=['POST'])
def attendance():
    connection = get_connection()
    try:
        cursor = connection.cursor()
        data = request.form
        timezone = pytz.timezone('America/Bogota')
        now = datetime.now(timezone)
        fecha_corta = now.strftime('%Y/%m/%d')
        fecha_larga = now.strftime('%Y/%m/%d %H:%M')

        cursor.execute("""
            INSERT INTO attendance
            (created_at, "Fecha", "Nombre", "Sexo", "Edad", "Correo", "Rol", "Calificación", "Futuros_eventos", "Comentario", "Tipo_documento", "Numero_documento", "Konradista", "Ciudad", "Carrera")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, (fecha_larga, fecha_corta, data['nombre_completo'], data['sexo'], data['edad'],
              data['correo_electronico'], data['rol'], data['calificacion'], data['futuros_eventos'],
              data['comentario'], data['tipo_doc'], data['numero_doc'], data['konradista'], data['ciudad'], data['carrera']))
        connection.commit()
    except Exception as e:
        print("Error attendance:", e)
        return jsonify({'success': False})
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'success': True})

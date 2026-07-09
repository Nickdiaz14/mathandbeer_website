from flask import Blueprint, request, jsonify
from db import get_connection, release_connection
from routes.daily import _calculate_streak

users_bp = Blueprint('users', __name__)

ADMINS = [
    '5a7d2cc7-963d-4a5d-a754-62c0c9292617',
    'f5b8e00b-7e2b-4c4a-8152-15423f7dac37',
    'f6765b9b-8a5f-4a56-ad4a-898097e87b85',
    'b99e88d6-10f7-4e9b-b898-812471be9a57',
    'd17e6ee5-253e-49ec-b0c9-d0ebbc8b664f',
]


@users_bp.route('/seeUser', methods=['POST'])
def seeUserExistense():
    user_id = request.json['user_id']
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT nickname FROM nickname WHERE userid = %s;", (user_id,))
        name = cursor.fetchone()
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'valid': True if name else False})


@users_bp.route('/generateUser', methods=['POST'])
def generateUser():
    user_id = request.json['user_id']
    nickname = request.json['nickname'].strip()

    if len(nickname) > 20:
        return jsonify({'valid': False, 'message': "Nombre de usuario demasiado largo"})

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT 1 FROM nickname WHERE LOWER(nickname) = LOWER(%s) AND userid != %s;", (nickname, user_id))
        if cursor.fetchone():
            return jsonify({'valid': False, 'message': "Nombre de usuario ya existe"})
        cursor.execute("INSERT INTO nickname (userid, nickname) VALUES (%s, %s);", (user_id, nickname))
        connection.commit()
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'valid': True, 'message_id': ''})


@users_bp.route('/api/profile/<userid>', methods=['GET'])
def get_profile(userid):
    connection = get_connection()
    try:
        cursor = connection.cursor()

        cursor.execute("SELECT nickname FROM nickname WHERE userid = %s;", (userid,))
        nick_row = cursor.fetchone()
        nickname = nick_row[0] if nick_row else None

        # Verificar si la cuenta está vinculada (Mejora 1)
        cursor.execute("SELECT email FROM user_credentials WHERE userid = %s;", (userid,))
        email_row = cursor.fetchone()
        is_linked = email_row is not None
        linked_email = email_row[0] if is_linked else None

        cursor.execute("SELECT COUNT(*) FROM comments WHERE userid = %s;", (userid,))
        total_comments = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM reactions WHERE userid = %s;", (userid,))
        total_brindis = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(DISTINCT board) FROM leaderboard WHERE userid = %s;", (userid,))
        games_played = cursor.fetchone()[0]

        cursor.execute("SELECT board, string_record FROM leaderboard WHERE userid = %s ORDER BY board;", (userid,))
        user_boards = cursor.fetchall()

        records = []
        desc_games = ['TContrareloj', 'TUnicolor', 'TBicolor', 'TProgresivo', 'TAleatorio', 'TCruzado', 'TKnight', 'TMini-Nerdle', 'TNerdle', 'TMaxi-Nerdle']

        for r in user_boards:
            b = r[0]
            val = r[1]
            order_type = "DESC" if b in desc_games else "ASC"
            cursor.execute(f"""
                SELECT position FROM (
                    SELECT ROW_NUMBER() OVER (ORDER BY record {order_type}) AS position, userid
                    FROM leaderboard WHERE board = %s
                ) t WHERE userid = %s;
            """, (b, userid))
            pos = cursor.fetchone()
            position = pos[0] if pos else '-'
            records.append({'game': b, 'record': val, 'position': position})

        cursor.execute("""
            SELECT e.id, e.title, e.speaker
            FROM reactions r JOIN events e ON e.id = r.event_id
            WHERE r.userid = %s ORDER BY e.date DESC;
        """, (userid,))
        liked_talks = [{'id': r[0], 'title': r[1], 'speaker': r[2]} for r in cursor.fetchall()]

        cursor.execute("""
            SELECT e.id, e.title, e.city, e.date
            FROM rsvp rv JOIN events e ON e.id = rv.event_id
            WHERE rv.userid = %s AND e.date > CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota' ORDER BY e.date;
        """, (userid,))
        rsvps = [{'id': r[0], 'title': r[1], 'city': r[2], 'date': r[3].isoformat()} for r in cursor.fetchall()]

        is_admin = userid in ADMINS
        tops_1 = []
        tops_2 = []

        if is_admin:
            cursor.execute("""
                WITH leaders AS (
                    SELECT
                    nickname,
                    board,
                    string_record,
                    ROW_NUMBER() OVER(
                            PARTITION BY board
                            ORDER BY
                                CASE
                                    WHEN string_record LIKE '%:%' THEN record * -1
                                    ELSE record
                                END DESC
                        ) AS enumeracion
                    FROM leader_final_view
                )
                SELECT nickname, COUNT(*) AS tops FROM leaders
                WHERE enumeracion = 1
                GROUP BY nickname
                ORDER BY tops DESC
            """)
            tops_1 = [{'nickname': r[0], 'tops_1': r[1]} for r in cursor.fetchall()]

            cursor.execute("""
                WITH fechas_unicas AS (
                    SELECT DISTINCT userid, challenge_date FROM daily_results
                ),
                diferencias AS (
                    SELECT
                        userid,
                        challenge_date,
                        challenge_date - (ROW_NUMBER() OVER (PARTITION BY userid ORDER BY challenge_date)) * INTERVAL '1 day' as grp
                    FROM fechas_unicas
                ),
                todas_las_rachas AS (
                    SELECT userid, COUNT(*) as racha
                    FROM diferencias
                    GROUP BY userid, grp
                )
                SELECT n.nickname, MAX(tlr.racha) as mejor_racha
                FROM todas_las_rachas tlr
                JOIN nickname n ON tlr.userid = n.userid
                GROUP BY n.nickname
                ORDER BY MAX(tlr.racha) DESC
                LIMIT 10;
            """)
            tops_2 = [{'nickname': r[0], 'tops_2': r[1]} for r in cursor.fetchall()]

    finally:
        cursor.close()
        release_connection(connection)

    return jsonify({
        'nickname': nickname,
        'is_linked': is_linked,
        'email': linked_email,
        'stats': {'comments': total_comments, 'brindis': total_brindis, 'games': games_played},
        'records': records,
        'liked_talks': liked_talks,
        'rsvps': rsvps,
        'is_admin': is_admin,
        'tops_1': tops_1,
        'tops_2': tops_2
    })


@users_bp.route('/api/profile/update-nickname', methods=['POST'])
def update_nickname():
    user_id = request.json.get('userid')
    new_nickname = request.json.get('nickname', '').strip()

    if not user_id or not new_nickname:
        return jsonify({'success': False, 'message': 'Datos incompletos'}), 400
    if len(new_nickname) > 20:
        return jsonify({'success': False, 'message': 'Máximo 20 caracteres'}), 400

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT 1 FROM nickname WHERE LOWER(nickname) = LOWER(%s) AND userid != %s;", (new_nickname, user_id))
        if cursor.fetchone():
            return jsonify({'success': False, 'message': 'Ese nombre ya está en uso'})
        cursor.execute("UPDATE nickname SET nickname = %s WHERE userid = %s;", (new_nickname, user_id))
        connection.commit()
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'success': True, 'nickname': new_nickname})


@users_bp.route('/api/badges/<userid>', methods=['GET'])
def get_badges(userid):
    connection = get_connection()
    try:
        cursor = connection.cursor()
        badges = []

        cursor.execute("SELECT 1 FROM nickname WHERE userid = %s;", (userid,))
        if cursor.fetchone():
            badges.append({'id': 'novato', 'name': 'Cervecero Novato', 'icon': '🍺', 'desc': 'Creaste tu cuenta'})

        cursor.execute("SELECT COUNT(DISTINCT event_id) FROM comments WHERE userid = %s;", (userid,))
        if cursor.fetchone()[0] >= 3:
            badges.append({'id': 'tertuliano', 'name': 'Tertuliano', 'icon': '💬', 'desc': 'Comentaste en 3+ charlas'})

        cursor.execute("SELECT COUNT(*) FROM reactions WHERE userid = %s;", (userid,))
        if cursor.fetchone()[0] >= 10:
            badges.append({'id': 'fan', 'name': 'Fan #1', 'icon': '🍻', 'desc': 'Brindaste por 10+ charlas'})

        cursor.execute("SELECT 1 FROM leaderboard WHERE userid = %s LIMIT 1;", (userid,))
        if cursor.fetchone():
            badges.append({'id': 'calculadora', 'name': 'Calculadora Humana', 'icon': '🧮', 'desc': 'Tienes récord en un juego'})

        cursor.execute("""
            SELECT 1 FROM (
                SELECT ROW_NUMBER() OVER (PARTITION BY board ORDER BY record DESC) AS pos, userid
                FROM leaderboard
            ) t WHERE t.pos <= 3 AND t.userid = %s LIMIT 1;
        """, (userid,))
        if cursor.fetchone():
            badges.append({'id': 'leyenda', 'name': 'Leyenda', 'icon': '⭐', 'desc': 'Top 3 en un leaderboard'})

        streak = _calculate_streak(userid)
        if streak['current'] >= 7 or streak['best'] >= 7:
            badges.append({'id': 'racha7', 'name': 'Fuego Lento', 'icon': '🔥', 'desc': 'Racha de 7 días en el reto diario'})
        if streak['current'] >= 30 or streak['best'] >= 30:
            badges.append({'id': 'racha30', 'name': 'Imparable', 'icon': '🌋', 'desc': 'Racha de 30 días en el reto diario'})

    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'badges': badges})


@users_bp.route('/api/profile/<userid>/performance', methods=['GET'])
def get_user_performance(userid):
    connection = get_connection()
    try:
        cursor = connection.cursor()
        # Obtener los últimos 15 resultados del reto diario del usuario ordenados por fecha
        cursor.execute("""
            SELECT challenge_date, record, game_type
            FROM daily_results
            WHERE userid = %s
            ORDER BY challenge_date ASC
            LIMIT 15;
        """, (userid,))
        rows = cursor.fetchall()
        
        performance = []
        for r in rows:
            c_date = r[0].strftime("%d/%m")
            record_raw = r[1]
            g_type = r[2]
            
            # Para juegos de tiempo (0hh1, 0hn0, cuentamania, kenken), convertir centisegundos a segundos
            if g_type in ('knight', 'nerdle'):
                val = float(record_raw)
            else:
                val = round(float(record_raw) / 100.0, 2)  # segundos
                
            performance.append({
                'date': c_date,
                'value': val,
                'game': g_type
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        release_connection(connection)
        
    return jsonify({'performance': performance})

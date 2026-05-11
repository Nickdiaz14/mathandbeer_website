from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta
import pytz
import random
import hashlib
from db import get_connection, release_connection

api_bp = Blueprint('api', __name__)

# ─── CONFIGURACIÓN RETO DIARIO ──────────────────────────────────
# Formato: (tipo_juego, tamaño, nombre_display)
# Agrega o quita juegos aquí para controlar qué aparece en el reto diario
DAILY_GAMES = [
    ('0hh1', 4, '0h-h1 4×4'),
    ('0hh1', 6, '0h-h1 6×6'),
    ('0hh1', 8, '0h-h1 8×8'),
    ('0hh1', 10, '0h-h1 10×10'),
    ('knight', 8, 'Salto Real'),
    ('cuentamania', 3, 'CuentaManía S'),
    ('cuentamania', 4, 'CuentaManía M'),
    ('cuentamania', 5, 'CuentaManía L'),
]

@api_bp.route('/attendance', methods=['POST'])
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

@api_bp.route('/0h_h1/play', methods=['POST'])
def get_cond_ini():
    n = request.json['n'] 
    with open(f'static/boards/aleatorios{n}.txt', 'r', encoding='utf-8') as file:
        lineas = file.readlines()
        linea_especifica = lineas[random.randint(0, len(lineas)-1)].strip()
    return jsonify({'matrix': eval(linea_especifica)})

@api_bp.route('/leaderboard/submit', methods=['POST'])
def update_leaderboard():
    better = False
    user_id = request.json['userid']
    board = request.json['game']
    record_raw = request.json['record']
    
    count_games = ['TContrareloj', 'TUnicolor', 'TBicolor', 'TProgresivo', 'TAleatorio']
    points_games = ['TCruzado', 'TKnight', 'TMini-Nerdle', 'TNerdle', 'TMaxi-Nerdle']

    connection = get_connection()
    try:
        cursor = connection.cursor()
        
        if board in count_games:
            record = int(record_raw)
            string_record = f'{record} tabs'
            is_better = lambda new, old: new > old
        elif board in points_games:
            record = float(record_raw)
            string_record = f'{round(record, 2)}'
            is_better = lambda new, old: new > old
        else:
            record = int(record_raw)
            string_record = f'{(record//6000):02}:{((record%6000)//100):02}.{(record%100):02}'
            is_better = lambda new, old: new < old

        cursor.execute("SELECT id, record FROM leaderboard WHERE userid = %s AND board = %s;", (user_id, board))
        prev_record = cursor.fetchone()

        if prev_record:
            lead_id = int(prev_record[0])
            prev_value = float(prev_record[1]) if board in points_games else int(prev_record[1])

            if is_better(record, prev_value):
                cursor.execute("UPDATE leaderboard SET record = %s, string_record = %s WHERE id = %s;", (record, string_record, lead_id))
                better = True
        else:
            cursor.execute("INSERT INTO leaderboard (board, userid, record, string_record) VALUES (%s, %s, %s, %s);", (board, user_id, record, string_record))

        connection.commit()
    except Exception as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'better': better})

@api_bp.route('/leaderboard/consult', methods=['POST'])
def get_leaderboard():
    user_id = request.json['userid']
    board = request.json['game']
    desc = ['TContrareloj', 'TUnicolor', 'TBicolor', 'TProgresivo', 'TAleatorio', 'TCruzado', 'TKnight', 'TMini-Nerdle', 'TNerdle', 'TMaxi-Nerdle']
    order_type = "DESC" if board in desc else ""

    connection = get_connection()
    try:
        cursor = connection.cursor()
        
        query = f"""
            SELECT ROW_NUMBER() OVER (PARTITION BY board ORDER BY record {order_type}) AS position,
                   nickname, string_record, userid
            FROM leader_final_view WHERE board = %s;
        """
        cursor.execute(query, (board,))
        ranking = cursor.fetchall()

        query_2 = f"""
            SELECT * FROM (
                SELECT ROW_NUMBER() OVER (PARTITION BY board ORDER BY record {order_type}) AS position,
                       nickname, string_record, userid
                FROM leader_final_view WHERE board = %s
            ) t WHERE t.userid = %s
        """
        cursor.execute(query_2, (board, user_id))
        personal_ranking = cursor.fetchone()
    finally:
        cursor.close()
        release_connection(connection)

    if personal_ranking and personal_ranking[0] > 0:
        return jsonify({'ranking': ranking, 'personal_ranking': personal_ranking, 'count_records': len(ranking)})
        
    return jsonify({'ranking': ranking, 'personal_ranking': ['-', '-', '-', '-'], 'count_records': len(ranking)})

@api_bp.route('/seeUser', methods=['POST'])
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

@api_bp.route('/generateUser', methods=['POST'])
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

# --- BLOG ROUTES ---
@api_bp.route('/api/comments/<int:event_id>', methods=['GET'])
def get_comments(event_id):
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT c.id, n.nickname, c.content, c.created_at, c.userid
            FROM comments c JOIN nickname n ON n.userid = c.userid
            WHERE c.event_id = %s ORDER BY c.created_at ASC;
        """, (event_id,))
        rows = cursor.fetchall()
        comments = [{'id': r[0], 'nickname': r[1], 'content': r[2], 'created_at': r[3].isoformat(), 'userid': r[4]} for r in rows]
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'comments': comments})

@api_bp.route('/api/comments/add', methods=['POST'])
def add_comment():
    user_id = request.json.get('userid')
    event_id = request.json.get('event_id')
    content = request.json.get('content', '').strip()

    if not user_id or not event_id or not content:
        return jsonify({'success': False, 'message': 'Datos incompletos'}), 400
    if len(content) > 500:
        return jsonify({'success': False, 'message': 'Comentario muy largo'}), 400

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT nickname FROM nickname WHERE userid = %s;", (user_id,))
        nick_row = cursor.fetchone()
        if not nick_row:
            return jsonify({'success': False, 'message': 'Debes crear un Nickname para comentar'}), 403

        cursor.execute("INSERT INTO comments (event_id, userid, content) VALUES (%s, %s, %s) RETURNING id, created_at;", (event_id, user_id, content))
        row = cursor.fetchone()
        connection.commit()
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'success': True, 'id': row[0], 'nickname': nick_row[0], 'created_at': row[1].isoformat()})

@api_bp.route('/api/reactions/<int:event_id>', methods=['GET'])
def get_reactions(event_id):
    user_id = request.args.get('userid', '')
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM reactions WHERE event_id = %s;", (event_id,))
        total = cursor.fetchone()[0]
        reacted = False
        if user_id:
            cursor.execute("SELECT 1 FROM reactions WHERE event_id = %s AND userid = %s;", (event_id, user_id))
            reacted = cursor.fetchone() is not None
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'total': total, 'reacted': reacted})

@api_bp.route('/api/reactions/toggle', methods=['POST'])
def toggle_reaction():
    user_id = request.json.get('userid')
    event_id = request.json.get('event_id')
    if not user_id or not event_id: return jsonify({'success': False}), 400

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id FROM reactions WHERE event_id = %s AND userid = %s;", (event_id, user_id))
        existing = cursor.fetchone()
        if existing:
            cursor.execute("DELETE FROM reactions WHERE id = %s;", (existing[0],))
            reacted = False
        else:
            cursor.execute("INSERT INTO reactions (event_id, userid) VALUES (%s, %s);", (event_id, user_id))
            reacted = True
        cursor.execute("SELECT COUNT(*) FROM reactions WHERE event_id = %s;", (event_id,))
        total = cursor.fetchone()[0]
        connection.commit()
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'success': True, 'reacted': reacted, 'total': total})

@api_bp.route('/api/subscribe', methods=['POST'])
def subscribe():
    email = request.json.get('email', '').strip().lower()
    name = request.json.get('name', '').strip()
    if not email or '@' not in email:
        return jsonify({'success': False, 'message': 'Correo inválido'}), 400
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("INSERT INTO subscribers (email, name) VALUES (%s, %s) ON CONFLICT (email) DO NOTHING;", (email, name or None))
        connection.commit()
    except Exception as e:
        connection.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'success': True})

# --- RSVP / CHECK-IN ---
@api_bp.route('/api/rsvp/<int:event_id>', methods=['GET'])
def get_rsvp(event_id):
    user_id = request.args.get('userid', '')
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM rsvp WHERE event_id = %s;", (event_id,))
        total = cursor.fetchone()[0]
        attending = False
        if user_id:
            cursor.execute("SELECT 1 FROM rsvp WHERE event_id = %s AND userid = %s;", (event_id, user_id))
            attending = cursor.fetchone() is not None
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'total': total, 'attending': attending})

@api_bp.route('/api/rsvp/toggle', methods=['POST'])
def toggle_rsvp():
    user_id = request.json.get('userid')
    event_id = request.json.get('event_id')
    if not user_id or not event_id:
        return jsonify({'success': False}), 400
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id FROM rsvp WHERE event_id = %s AND userid = %s;", (event_id, user_id))
        existing = cursor.fetchone()
        if existing:
            cursor.execute("DELETE FROM rsvp WHERE id = %s;", (existing[0],))
            attending = False
        else:
            cursor.execute("INSERT INTO rsvp (event_id, userid) VALUES (%s, %s);", (event_id, user_id))
            attending = True
        cursor.execute("SELECT COUNT(*) FROM rsvp WHERE event_id = %s;", (event_id,))
        total = cursor.fetchone()[0]
        connection.commit()
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'success': True, 'attending': attending, 'total': total})

# --- PROFILE ---
@api_bp.route('/api/profile/<userid>', methods=['GET'])
def get_profile(userid):
    connection = get_connection()
    try:
        cursor = connection.cursor()
        # Nickname
        cursor.execute("SELECT nickname FROM nickname WHERE userid = %s;", (userid,))
        nick_row = cursor.fetchone()
        nickname = nick_row[0] if nick_row else None

        # Stats
        cursor.execute("SELECT COUNT(*) FROM comments WHERE userid = %s;", (userid,))
        total_comments = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM reactions WHERE userid = %s;", (userid,))
        total_brindis = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(DISTINCT board) FROM leaderboard WHERE userid = %s;", (userid,))
        games_played = cursor.fetchone()[0]

        # Records personales
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

        # Charlas con brindis
        cursor.execute("""
            SELECT e.id, e.title, e.speaker
            FROM reactions r JOIN events e ON e.id = r.event_id
            WHERE r.userid = %s ORDER BY e.date DESC;
        """, (userid,))
        liked_talks = [{'id': r[0], 'title': r[1], 'speaker': r[2]} for r in cursor.fetchall()]

        # RSVPs
        cursor.execute("""
            SELECT e.id, e.title, e.city, e.date
            FROM rsvp rv JOIN events e ON e.id = rv.event_id
            WHERE rv.userid = %s AND e.date > CURRENT_TIMESTAMP ORDER BY e.date;
        """, (userid,))
        rsvps = [{'id': r[0], 'title': r[1], 'city': r[2], 'date': r[3].isoformat()} for r in cursor.fetchall()]

        #admins
        admins = [
            '5a7d2cc7-963d-4a5d-a754-62c0c9292617', 
            'f5b8e00b-7e2b-4c4a-8152-15423f7dac37', 
            'f6765b9b-8a5f-4a56-ad4a-898097e87b85', 
            'b99e88d6-10f7-4e9b-b898-812471be9a57', 
            'd17e6ee5-253e-49ec-b0c9-d0ebbc8b664f'
            ]
        
        is_admin = userid in admins

        if is_admin:
            #admin
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

    finally:
        cursor.close()
        release_connection(connection)

    return jsonify({
        'nickname': nickname,
        'stats': {'comments': total_comments, 'brindis': total_brindis, 'games': games_played},
        'records': records,
        'liked_talks': liked_talks,
        'rsvps': rsvps,
        'is_admin': is_admin,
        'tops_1': tops_1
    })

# --- UPDATE NICKNAME ---
@api_bp.route('/api/profile/update-nickname', methods=['POST'])
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
        # Verificar unicidad
        cursor.execute("SELECT 1 FROM nickname WHERE LOWER(nickname) = LOWER(%s) AND userid != %s;", (new_nickname, user_id))
        if cursor.fetchone():
            return jsonify({'success': False, 'message': 'Ese nombre ya está en uso'})

        cursor.execute("UPDATE nickname SET nickname = %s WHERE userid = %s;", (new_nickname, user_id))
        connection.commit()
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'success': True, 'nickname': new_nickname})

# --- BADGES ---
@api_bp.route('/api/badges/<userid>', methods=['GET'])
def get_badges(userid):
    connection = get_connection()
    try:
        cursor = connection.cursor()

        badges = []

        # Cervecero Novato: tiene nickname
        cursor.execute("SELECT 1 FROM nickname WHERE userid = %s;", (userid,))
        if cursor.fetchone():
            badges.append({'id': 'novato', 'name': 'Cervecero Novato', 'icon': '🍺', 'desc': 'Creaste tu cuenta'})

        # Tertuliano: comentar en 3+ charlas distintas
        cursor.execute("SELECT COUNT(DISTINCT event_id) FROM comments WHERE userid = %s;", (userid,))
        distinct_comments = cursor.fetchone()[0]
        if distinct_comments >= 3:
            badges.append({'id': 'tertuliano', 'name': 'Tertuliano', 'icon': '💬', 'desc': 'Comentaste en 3+ charlas'})

        # Fan #1: brindis a 10+ charlas
        cursor.execute("SELECT COUNT(*) FROM reactions WHERE userid = %s;", (userid,))
        total_reactions = cursor.fetchone()[0]
        if total_reactions >= 10:
            badges.append({'id': 'fan', 'name': 'Fan #1', 'icon': '🍻', 'desc': 'Brindaste por 10+ charlas'})

        # Calculadora Humana: récord en cualquier juego
        cursor.execute("SELECT 1 FROM leaderboard WHERE userid = %s LIMIT 1;", (userid,))
        if cursor.fetchone():
            badges.append({'id': 'calculadora', 'name': 'Calculadora Humana', 'icon': '🧮', 'desc': 'Tienes récord en un juego'})

        # Leyenda: top 3 en algún leaderboard
        cursor.execute("""
            SELECT 1 FROM (
                SELECT ROW_NUMBER() OVER (PARTITION BY board ORDER BY record DESC) AS pos, userid
                FROM leaderboard
            ) t WHERE t.pos <= 3 AND t.userid = %s LIMIT 1;
        """, (userid,))
        if cursor.fetchone():
            badges.append({'id': 'leyenda', 'name': 'Leyenda', 'icon': '⭐', 'desc': 'Top 3 en un leaderboard'})

        # Racha de 7 días (reto diario)
        streak = _calculate_streak(userid)
        if streak['current'] >= 7 or streak['best'] >= 7:
            badges.append({'id': 'racha7', 'name': 'Fuego Lento', 'icon': '🔥', 'desc': 'Racha de 7 días en el reto diario'})
        if streak['current'] >= 30 or streak['best'] >= 30:
            badges.append({'id': 'racha30', 'name': 'Imparable', 'icon': '🌋', 'desc': 'Racha de 30 días en el reto diario'})

    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'badges': badges})

# --- Q&A: PREGUNTAS PARA PONENTES ---
@api_bp.route('/api/questions/<int:event_id>', methods=['GET'])
def get_questions(event_id):
    user_id = request.args.get('userid', '')
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT q.id, n.nickname, q.content, q.created_at,
                   (SELECT COUNT(*) FROM question_votes WHERE question_id = q.id) AS votes
            FROM questions q
            JOIN nickname n ON n.userid = q.userid
            WHERE q.event_id = %s
            ORDER BY votes DESC, q.created_at ASC;
        """, (event_id,))
        rows = cursor.fetchall()

        questions = []
        for r in rows:
            voted = False
            if user_id:
                cursor.execute("SELECT 1 FROM question_votes WHERE question_id = %s AND userid = %s;", (r[0], user_id))
                voted = cursor.fetchone() is not None
            questions.append({
                'id': r[0], 'nickname': r[1], 'content': r[2],
                'created_at': r[3].isoformat(), 'votes': r[4], 'voted': voted
            })
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'questions': questions})

@api_bp.route('/api/questions/add', methods=['POST'])
def add_question():
    user_id = request.json.get('userid')
    event_id = request.json.get('event_id')
    content = request.json.get('content', '').strip()

    if not user_id or not event_id or not content:
        return jsonify({'success': False, 'message': 'Datos incompletos'}), 400
    if len(content) > 300:
        return jsonify({'success': False, 'message': 'Pregunta muy larga (máx. 300)'}), 400

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT nickname FROM nickname WHERE userid = %s;", (user_id,))
        nick_row = cursor.fetchone()
        if not nick_row:
            return jsonify({'success': False, 'message': 'Necesitas un Nickname'}), 403

        cursor.execute("""
            INSERT INTO questions (event_id, userid, content) VALUES (%s, %s, %s) RETURNING id, created_at;
        """, (event_id, user_id, content))
        row = cursor.fetchone()
        connection.commit()
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'success': True, 'id': row[0], 'nickname': nick_row[0], 'created_at': row[1].isoformat(), 'votes': 0})

@api_bp.route('/api/questions/vote', methods=['POST'])
def vote_question():
    user_id = request.json.get('userid')
    question_id = request.json.get('question_id')
    if not user_id or not question_id:
        return jsonify({'success': False}), 400

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id FROM question_votes WHERE question_id = %s AND userid = %s;", (question_id, user_id))
        existing = cursor.fetchone()
        if existing:
            cursor.execute("DELETE FROM question_votes WHERE id = %s;", (existing[0],))
            voted = False
        else:
            cursor.execute("INSERT INTO question_votes (question_id, userid) VALUES (%s, %s);", (question_id, user_id))
            voted = True
        cursor.execute("SELECT COUNT(*) FROM question_votes WHERE question_id = %s;", (question_id,))
        total = cursor.fetchone()[0]
        connection.commit()
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'success': True, 'voted': voted, 'votes': total})

# ─── DAILY CHALLENGE ─────────────────────────────────────────────

def _get_daily_seed():
    """Genera un seed determinístico basado en la fecha de hoy."""
    today = date.today().isoformat()
    return int(hashlib.md5(today.encode()).hexdigest(), 16)

def _get_daily_game():
    """Selecciona el juego del día usando el seed de la fecha."""
    seed = _get_daily_seed()
    game = DAILY_GAMES[seed % len(DAILY_GAMES)]
    return game  # (tipo, tamaño, nombre)

def _generate_daily_board(game_type, game_size, seed):
    """Genera el tablero del día de forma determinística."""
    rng = random.Random(seed)

    if game_type == '0hh1':
        with open(f'static/boards/aleatorios{game_size}.txt', 'r', encoding='utf-8') as f:
            lines = f.readlines()
        line_idx = seed % len(lines)
        return eval(lines[line_idx].strip())

    elif game_type == 'knight':
        # Generar spots del caballo con seed fija
        spots = []
        count = 0
        while len(spots) < 6:
            count += 1
            a = rng.randint(0, 7)
            b = rng.randint(0, 7)
            ok = True
            for p in spots:
                if abs(a - p[0]) + abs(b - p[1]) < 3:
                    ok = False
                    break
            if ok:
                spots.append([a, b, 0])
            if count >= 400:
                spots = []
                count = 0
        knight_idx = rng.randint(0, len(spots) - 1)
        spots[knight_idx][2] = 1
        return spots

    elif game_type == 'cuentamania':
        numbers = list(range(1, game_size * game_size + 1))
        rng.shuffle(numbers)
        board = []
        for i in range(game_size):
            row = numbers[i * game_size:(i + 1) * game_size]
            board.append(row)
        return board

    return None

@api_bp.route('/api/daily', methods=['GET'])
def get_daily():
    user_id = request.args.get('userid', '')
    game_type, game_size, game_name = _get_daily_game()
    seed = _get_daily_seed()
    board_data = _generate_daily_board(game_type, game_size, seed)
    today = date.today().isoformat()

    already_played = False
    user_record = None

    if user_id:
        connection = get_connection()
        try:
            cursor = connection.cursor()
            cursor.execute(
                "SELECT record FROM daily_results WHERE challenge_date = %s AND userid = %s;",
                (today, user_id)
            )
            row = cursor.fetchone()
            if row:
                already_played = True
                user_record = row[0]
        finally:
            cursor.close()
            release_connection(connection)

    # Determinar tipo de record para formateo
    record_type = 'time'  # centisegundos
    if game_type == 'knight':
        record_type = 'points'
    elif game_type == '0hh1':
        record_type = 'time'
    elif game_type == 'cuentamania':
        record_type = 'time'

    return jsonify({
        'game_type': game_type,
        'game_size': game_size,
        'game_name': game_name,
        'date': today,
        'already_played': already_played,
        'user_record': user_record,
        'board_data': board_data,
        'record_type': record_type
    })

@api_bp.route('/api/daily/submit', methods=['POST'])
def submit_daily():
    user_id = request.json.get('userid')
    record = request.json.get('record')

    if not user_id or record is None:
        return jsonify({'success': False, 'message': 'Datos incompletos'}), 400

    game_type, game_size, game_name = _get_daily_game()
    today = date.today().isoformat()

    connection = get_connection()
    try:
        cursor = connection.cursor()
        # Verificar que no haya jugado hoy
        cursor.execute(
            "SELECT id FROM daily_results WHERE challenge_date = %s AND userid = %s;",
            (today, user_id)
        )
        if cursor.fetchone():
            return jsonify({'success': False, 'message': 'Ya jugaste el reto de hoy'})

        cursor.execute(
            """INSERT INTO daily_results (challenge_date, game_type, game_size, userid, record)
               VALUES (%s, %s, %s, %s, %s);""",
            (today, game_type, game_size, user_id, int(record))
        )
        connection.commit()

        # Obtener posición
        if game_type == 'knight':
            cursor.execute(
                """SELECT COUNT(*) + 1 FROM daily_results
                   WHERE challenge_date = %s AND record > %s;""",
                (today, int(record))
            )
        else:
            cursor.execute(
                """SELECT COUNT(*) + 1 FROM daily_results
                   WHERE challenge_date = %s AND record < %s;""",
                (today, int(record))
            )
        position = cursor.fetchone()[0]
    finally:
        cursor.close()
        release_connection(connection)

    return jsonify({'success': True, 'position': position})

@api_bp.route('/api/daily/leaderboard', methods=['GET'])
def daily_leaderboard():
    user_id = request.args.get('userid', '')
    today = date.today().isoformat()
    game_type, game_size, game_name = _get_daily_game()

    # Knight es puntos (mayor mejor), el resto es tiempo (menor mejor)
    order = 'DESC' if game_type == 'knight' else 'ASC'

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(f"""
            WITH top_today AS (
                SELECT dr.userid, dr.record, n.nickname,
                    ROW_NUMBER() OVER (ORDER BY dr.record {order}) AS pos
                FROM daily_results dr
                JOIN nickname n ON n.userid = dr.userid
                WHERE dr.challenge_date = %s
                ORDER BY dr.record {order}
                LIMIT 10
            ),
            historial_top AS (
                -- 2. Sacamos el historial de fechas SOLO para esos 10 usuarios.
                -- Usamos DENSE_RANK por si un usuario tiene varios intentos el mismo día.
                SELECT dr.userid, dr.challenge_date,
                    DENSE_RANK() OVER (PARTITION BY dr.userid ORDER BY dr.challenge_date DESC) as rn
                FROM daily_results dr
                JOIN top_today t ON dr.userid = t.userid
                WHERE dr.challenge_date <= %s
            ),
            racha_actual AS (
                -- 3. Filtramos solo los días que forman parte de la cadena ininterrumpida.
                -- Si un registro ocurrió hace 3 días, su 'rn' debe ser 4 (contando hoy como 1).
                SELECT userid, MAX(rn) AS streak
                FROM historial_top
                
                -- IMPORTANTE: Ajusta esta línea según el motor de tu base de datos (ver abajo)
                WHERE challenge_date = %s::date - (rn - 1)::int
                
                GROUP BY userid
            )

            -- 4. Unimos el top 10 con su racha calculada.
            SELECT t.pos, t.nickname, t.record, t.userid, COALESCE(r.streak, 1) AS racha
            FROM top_today t
            LEFT JOIN racha_actual r ON t.userid = r.userid
            ORDER BY t.pos;
        """, (today,today,today))
        ranking = cursor.fetchall()

        # Formatear records
        formatted = []
        for r in ranking:
            if game_type == 'knight':
                formatted.append([r[0], r[1], f'{round(r[2], 2)}', r[3], r[4]])
            else:
                rec = int(r[2])
                formatted.append([r[0], r[1], f'{(rec//6000):02}:{((rec%6000)//100):02}.{(rec%100):02}', r[3], r[4]])

        # Posición personal
        personal = ['-', '-', '-', '-', '-']
        if user_id:
            cursor.execute(f"""
                SELECT pos, nickname, record, userid FROM (
                    SELECT ROW_NUMBER() OVER (ORDER BY record {order}) AS pos,
                           n.nickname, dr.record, dr.userid
                    FROM daily_results dr
                    JOIN nickname n ON n.userid = dr.userid
                    WHERE dr.challenge_date = %s
                ) t WHERE t.userid = %s;
            """, (today, user_id))
            prow = cursor.fetchone()
            if prow:
                # Obtener racha para el ranking personal
                u_streak = _calculate_streak(user_id)['current']
                if game_type == 'knight':
                    personal = [prow[0], prow[1], f'{round(prow[2], 2)}', prow[3], u_streak]
                else:
                    rec = int(prow[2])
                    personal = [prow[0], prow[1], f'{(rec//6000):02}:{((rec%6000)//100):02}.{(rec%100):02}', prow[3], u_streak]

        cursor.execute("SELECT COUNT(*) FROM daily_results WHERE challenge_date = %s;", (today,))
        total = cursor.fetchone()[0]
    finally:
        cursor.close()
        release_connection(connection)

    return jsonify({
        'ranking': formatted,
        'personal_ranking': personal,
        'count_records': total,
        'game_name': game_name,
        'record_type': 'points' if game_type == 'knight' else 'time'
    })

# ─── STREAK (RACHA) ──────────────────────────────────────────────

def _calculate_streak(userid):
    """Calcula la racha de reto diario del usuario."""
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT DISTINCT challenge_date FROM daily_results
            WHERE userid = %s ORDER BY challenge_date DESC;
        """, (userid,))
        dates = [row[0] for row in cursor.fetchall()]
    finally:
        cursor.close()
        release_connection(connection)

    if not dates:
        return {'current': 0, 'best': 0, 'today': False}

    today = date.today()
    today_played = dates[0] == today

    # Racha actual: contar días consecutivos desde hoy (o ayer si hoy no ha jugado)
    streak = 0
    check_date = today if today_played else today - timedelta(days=1)
    for d in dates:
        if d == check_date:
            streak += 1
            check_date -= timedelta(days=1)
        elif d < check_date:
            break

    # Mejor racha histórica
    best = 1 if dates else 0
    current_run = 1
    for i in range(1, len(dates)):
        if dates[i - 1] - dates[i] == timedelta(days=1):
            current_run += 1
            best = max(best, current_run)
        else:
            current_run = 1

    return {'current': streak, 'best': max(best, streak), 'today': today_played}

@api_bp.route('/api/streak/<userid>', methods=['GET'])
def get_streak(userid):
    streak = _calculate_streak(userid)
    return jsonify(streak)
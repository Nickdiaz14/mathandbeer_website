from flask import Blueprint, request, jsonify
from datetime import date, datetime, timedelta
import hashlib
import random
import psycopg2
import pytz
from db import get_connection, release_connection
from boards import BOARDS

daily_bp = Blueprint('daily', __name__)

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
    ('0hn0', 4, '0h-n0 4×4'),
    ('0hn0', 5, '0h-n0 5×5'),
    ('nerdle', 6, 'Nerdle Mini'),
    ('nerdle', 8, 'Nerdle Standard'),
    ('nerdle', 10, 'Nerdle Maxi'),
    ('kenken', 4, 'KenKen 4×4'),
    ('kenken', 5, 'KenKen 5×5')
]


def _get_bogota_date():
    """Get current date in America/Bogota timezone"""
    timezone = pytz.timezone('America/Bogota')
    return datetime.now(timezone).date()


def _get_time_until_reset():
    """Get seconds until the daily reset (midnight in Bogota)"""
    timezone = pytz.timezone('America/Bogota')
    now = datetime.now(timezone)
    tomorrow = now.date() + timedelta(days=1)
    reset_time = timezone.localize(datetime.combine(tomorrow, datetime.min.time()), is_dst=None)
    seconds_left = (reset_time - now).total_seconds()
    return max(0, int(seconds_left))


def _get_daily_seed():
    today = _get_bogota_date().isoformat()
    return int(hashlib.md5(today.encode()).hexdigest(), 16)


def _get_daily_game():
    seed = _get_daily_seed()
    return DAILY_GAMES[seed % len(DAILY_GAMES)]


def _generate_daily_board(game_type, game_size, seed):
    rng = random.Random(seed)

    if game_type == '0hh1':
        boards = BOARDS[f'aleatorios{game_size}']
        return boards[seed % len(boards)]

    elif game_type == 'knight':
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

    elif game_type == '0hn0':
        boards = BOARDS[f'ohno{game_size}']
        return boards[seed % len(boards)]

    elif game_type == 'nerdle':
        boards = BOARDS[f'igualdades{game_size}']
        return boards[seed % len(boards)]

    elif game_type == 'kenken':
        from routes.games import generate_kenken
        return generate_kenken(game_size, seed)

    return None


def _calculate_streak_with_cursor(cursor, userid):
    """Calcula la racha combinando las fechas jugadas y los escudos de racha usados."""
    cursor.execute("""
        SELECT DISTINCT challenge_date FROM daily_results
        WHERE userid = %s;
    """, (userid,))
    played_dates = {row[0] for row in cursor.fetchall()}

    cursor.execute("""
        SELECT DISTINCT freeze_date FROM streak_freezes_used
        WHERE userid = %s;
    """, (userid,))
    freeze_dates = {row[0] for row in cursor.fetchall()}

    all_dates = sorted(played_dates.union(freeze_dates), reverse=True)

    if not all_dates:
        return {'current': 0, 'best': 0, 'today': False}

    today = _get_bogota_date()
    today_played = today in played_dates

    streak = 0
    # La racha está activa si jugó hoy o si se usó un escudo/jugó ayer
    check_date = today if (today in played_dates or today in freeze_dates) else today - timedelta(days=1)
    for d in all_dates:
        if d == check_date:
            streak += 1
            check_date -= timedelta(days=1)
        elif d < check_date:
            break

    best = 1 if all_dates else 0
    current_run = 1
    for i in range(1, len(all_dates)):
        if all_dates[i - 1] - all_dates[i] == timedelta(days=1):
            current_run += 1
            best = max(best, current_run)
        else:
            current_run = 1

    return {'current': streak, 'best': max(best, streak), 'today': today_played}

def _calculate_streak(userid):
    connection = get_connection()
    try:
        cursor = connection.cursor()
        res = _calculate_streak_with_cursor(cursor, userid)
    finally:
        cursor.close()
        release_connection(connection)
    return res


@daily_bp.route('/api/daily', methods=['GET'])
def get_daily():
    user_id = request.args.get('userid', '')
    game_type, game_size, game_name = _get_daily_game()
    seed = _get_daily_seed()
    board_data = _generate_daily_board(game_type, game_size, seed)
    today = _get_bogota_date().isoformat()
    time_until_reset = _get_time_until_reset()

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

    record_type = 'time'
    if game_type in ('knight', 'nerdle'):
        record_type = 'points'

    return jsonify({
        'game_type': game_type,
        'game_size': game_size,
        'game_name': game_name,
        'date': today,
        'already_played': already_played,
        'user_record': user_record,
        'board_data': board_data,
        'record_type': record_type,
        'time_until_reset': time_until_reset
    })


@daily_bp.route('/api/daily/submit', methods=['POST'])
def submit_daily():
    user_id = request.json.get('userid')
    record = request.json.get('record')

    if not user_id or record is None:
        return jsonify({'success': False, 'message': 'Datos incompletos'}), 400

    game_type, game_size, game_name = _get_daily_game()
    today = _get_bogota_date().isoformat()

    record_val = float(record) if game_type in ('knight', 'nerdle') else int(record)

    connection = get_connection()
    consumed_freeze = False
    earned_freeze = False
    new_streak = 0

    try:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT id FROM daily_results WHERE challenge_date = %s AND userid = %s;",
            (today, user_id)
        )
        if cursor.fetchone():
            return jsonify({'success': False, 'message': 'Ya jugaste el reto de hoy'})

        # Verificar si corresponde consumir un escudo de racha (Streak Freeze)
        today_date = _get_bogota_date()
        yesterday = today_date - timedelta(days=1)
        day_before = today_date - timedelta(days=2)

        cursor.execute("SELECT 1 FROM daily_results WHERE challenge_date = %s AND userid = %s;", (yesterday, user_id))
        played_yesterday = cursor.fetchone() is not None

        cursor.execute("SELECT 1 FROM streak_freezes_used WHERE freeze_date = %s AND userid = %s;", (yesterday, user_id))
        frozen_yesterday = cursor.fetchone() is not None

        if not played_yesterday and not frozen_yesterday:
            # Ayer no jugó ni se usó escudo. Verificar si tenía racha activa anteayer
            cursor.execute("SELECT 1 FROM daily_results WHERE challenge_date = %s AND userid = %s;", (day_before, user_id))
            played_day_before = cursor.fetchone() is not None
            cursor.execute("SELECT 1 FROM streak_freezes_used WHERE freeze_date = %s AND userid = %s;", (day_before, user_id))
            frozen_day_before = cursor.fetchone() is not None

            if played_day_before or frozen_day_before:
                # Tenía racha anteayer. Verificar si tiene escudos
                cursor.execute("SELECT freezes_count FROM streak_freezes WHERE userid = %s;", (user_id,))
                freeze_row = cursor.fetchone()
                freezes_avail = freeze_row[0] if freeze_row else 0

                if freezes_avail > 0:
                    # Consumir un escudo
                    cursor.execute("""
                        UPDATE streak_freezes 
                        SET freezes_count = freezes_count - 1 
                        WHERE userid = %s;
                    """, (user_id,))
                    cursor.execute("""
                        INSERT INTO streak_freezes_used (userid, freeze_date)
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING;
                    """, (user_id, yesterday))
                    consumed_freeze = True

        try:
            cursor.execute(
                """INSERT INTO daily_results (challenge_date, game_type, game_size, userid, record)
                   VALUES (%s, %s, %s, %s, %s);""",
                (today, game_type, game_size, user_id, record_val)
            )
        except psycopg2.errors.UniqueViolation:
            connection.rollback()
            return jsonify({'success': False, 'message': 'Ya jugaste el reto de hoy'})

        # Calcular nueva racha y ver si gana un escudo
        new_streak_info = _calculate_streak_with_cursor(cursor, user_id)
        new_streak = new_streak_info['current']

        if new_streak > 0 and new_streak % 7 == 0:
            cursor.execute("""
                INSERT INTO streak_freezes (userid, freezes_count)
                VALUES (%s, 1)
                ON CONFLICT (userid) DO UPDATE
                SET freezes_count = LEAST(2, streak_freezes.freezes_count + 1);
            """, (user_id,))
            earned_freeze = True

        connection.commit()

        if game_type in ('knight', 'nerdle'):
            cursor.execute(
                "SELECT COUNT(*) + 1 FROM daily_results WHERE challenge_date = %s AND record > %s;",
                (today, record_val)
            )
        else:
            cursor.execute(
                "SELECT COUNT(*) + 1 FROM daily_results WHERE challenge_date = %s AND record < %s;",
                (today, record_val)
            )
        position = cursor.fetchone()[0]
    except Exception as e:
        connection.rollback()
        return jsonify({'success': False, 'message': f'Error al guardar resultado: {str(e)}'}), 500
    finally:
        cursor.close()
        release_connection(connection)

    return jsonify({
        'success': True,
        'position': position,
        'consumed_freeze': consumed_freeze,
        'earned_freeze': earned_freeze,
        'new_streak': new_streak
    })


@daily_bp.route('/api/daily/leaderboard', methods=['GET'])
def daily_leaderboard():
    user_id = request.args.get('userid', '')
    today = _get_bogota_date().isoformat()
    game_type, game_size, game_name = _get_daily_game()

    order = 'DESC' if game_type in ('knight', 'nerdle') else 'ASC'

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
                SELECT dr.userid, dr.challenge_date,
                    DENSE_RANK() OVER (PARTITION BY dr.userid ORDER BY dr.challenge_date DESC) as rn
                FROM daily_results dr
                JOIN top_today t ON dr.userid = t.userid
                WHERE dr.challenge_date <= %s
            ),
            racha_actual AS (
                SELECT userid, MAX(rn) AS streak
                FROM historial_top
                WHERE challenge_date = %s::date - (rn - 1)::int
                GROUP BY userid
            )
            SELECT t.pos, t.nickname, t.record, t.userid, COALESCE(r.streak, 1) AS racha
            FROM top_today t
            LEFT JOIN racha_actual r ON t.userid = r.userid
            ORDER BY t.pos;
        """, (today, today, today))
        ranking = cursor.fetchall()

        formatted = []
        for r in ranking:
            if game_type in ('knight', 'nerdle'):
                formatted.append([r[0], r[1], f'{round(float(r[2]), 2)}', r[3], r[4]])
            else:
                rec = int(r[2])
                formatted.append([r[0], r[1], f'{(rec//6000):02}:{((rec%6000)//100):02}.{(rec%100):02}', r[3], r[4]])

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
                u_streak = _calculate_streak(user_id)['current']
                if game_type in ('knight', 'nerdle'):
                    personal = [prow[0], prow[1], f'{round(float(prow[2]), 2)}', prow[3], u_streak]
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
        'record_type': 'points' if game_type in ('knight', 'nerdle') else 'time'
    })


@daily_bp.route('/api/streak/<userid>', methods=['GET'])
def get_streak(userid):
    res = _calculate_streak(userid)
    connection = get_connection()
    freezes_count = 0
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT freezes_count FROM streak_freezes WHERE userid = %s;", (userid,))
        row = cursor.fetchone()
        if row:
            freezes_count = row[0]
    finally:
        cursor.close()
        release_connection(connection)
    
    res['freezes_count'] = freezes_count
    return jsonify(res)

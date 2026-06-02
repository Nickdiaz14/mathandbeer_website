from flask import Blueprint, request, jsonify
import ast
import random
from db import get_connection, release_connection

games_bp = Blueprint('games', __name__)

@games_bp.route('/0h_h1/play', methods=['POST'])
def get_cond_ini():
    n = request.json['n']
    with open(f'static/boards/aleatorios{n}.txt', 'r', encoding='utf-8') as file:
        lineas = file.readlines()
        linea_especifica = lineas[random.randint(0, len(lineas)-1)].strip()
    return jsonify({'matrix': ast.literal_eval(linea_especifica)})

@games_bp.route('/0h_n0/play', methods=['POST'])
def get_cond_ini_0h_n0():
    n = request.json['n']
    with open(f'static/boards/aleatorios_ohno{n}.txt', 'r', encoding='utf-8') as file:
        lineas = file.readlines()
        linea_especifica = lineas[random.randint(0, len(lineas)-1)].strip()
    return jsonify({'matrix': ast.literal_eval(linea_especifica)})

@games_bp.route('/nerdle/play', methods=['POST'])
def get_cond_ini_nerdle():
    n = request.json['n']
    with open(f'static/boards/igualdades{n}.txt', 'r', encoding='utf-8') as file:
        lineas = file.readlines()
        linea_especifica = lineas[random.randint(0, len(lineas)-1)].strip()
    return jsonify({'equalities': linea_especifica})

@games_bp.route('/leaderboard/submit', methods=['POST'])
def update_leaderboard():
    better = False
    user_id = request.json['userid']
    board = request.json['game']
    record_raw = request.json['record']

    count_games = ['TContrareloj', 'TUnicolor', 'TBicolor', 'TProgresivo', 'TAleatorio']
    points_games = ['TCruzado', 'TKnight', 'NRD6', 'NRD8', 'NRD10']
    cell_games = ['TKnightTT']

    connection = get_connection()
    try:
        cursor = connection.cursor()

        if board in cell_games:
            record = int(record_raw)
            string_record = f'{record} celdas'
            is_better = lambda new, old: new > old
        elif board in count_games:
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

@games_bp.route('/leaderboard/consult', methods=['POST'])
def get_leaderboard():
    user_id = request.json['userid']
    board = request.json['game']
    desc = ['TContrareloj', 'TUnicolor', 'TBicolor', 'TProgresivo', 'TAleatorio', 'TCruzado', 'TKnight', 'NRD6', 'NRD8', 'NRD10', 'TKnightTT']
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

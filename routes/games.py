from flask import Blueprint, request, jsonify
import random
from db import get_connection, release_connection
from boards import BOARDS

games_bp = Blueprint('games', __name__)

_VALID_0HH1  = {4, 6, 8, 10}
_VALID_0HN0  = {4, 5}
_VALID_NERDLE = {6, 8, 10}
_VALID_KENKEN = {4, 5}

def generate_kenken(size, seed_val):
    """Generador procedural determinista de KenKen basado en Latin Squares."""
    rng = random.Random(seed_val)
    
    # 1. Generar Latin Square base
    base = list(range(1, size + 1))
    grid = []
    for i in range(size):
        grid.append(base[i:] + base[:i])
    
    # Mezclar filas
    rows = list(range(size))
    rng.shuffle(rows)
    grid = [grid[r] for r in rows]
    
    # Mezclar columnas
    cols = list(range(size))
    rng.shuffle(cols)
    new_grid = []
    for r in range(size):
        new_row = [grid[r][c] for c in cols]
        new_grid.append(new_row)
    grid = new_grid
    
    # 2. Agrupar celdas en jaulas (cages) usando BFS/DFS aleatorio
    cells = []
    for r in range(size):
        for c in range(size):
            cells.append((r, c))
            
    visited = set()
    cages = []
    
    def get_neighbors(r, c):
        res = []
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < size and 0 <= nc < size:
                res.append((nr, nc))
        return res
        
    cage_id = 0
    for r in range(size):
        for c in range(size):
            if (r, c) in visited:
                continue
                
            cage_cells = [(r, c)]
            visited.add((r, c))
            
            # Tamaño de jaula: 1 a 3 celdas (para mantenerlo divertido)
            target_size = rng.choice([1, 2, 2, 3, 3])
            
            attempts = 0
            while len(cage_cells) < target_size and attempts < 10:
                attempts += 1
                ref_cell = rng.choice(cage_cells)
                neighbors = get_neighbors(*ref_cell)
                unvisited = [n for n in neighbors if n not in visited]
                if unvisited:
                    next_cell = rng.choice(unvisited)
                    cage_cells.append(next_cell)
                    visited.add(next_cell)
            
            # Calcular operador y valor objetivo
            cage_vals = [grid[cr][cc] for cr, cc in cage_cells]
            if len(cage_cells) == 1:
                op = ''
                target = cage_vals[0]
            elif len(cage_cells) == 2:
                v1, v2 = cage_vals
                ops = ['+', '*']
                if abs(v1 - v2) > 0:
                    ops.append('-')
                if v1 % v2 == 0 or v2 % v1 == 0:
                    ops.append('/')
                
                op = rng.choice(ops)
                if op == '+':
                    target = v1 + v2
                elif op == '*':
                    target = v1 * v2
                elif op == '-':
                    target = abs(v1 - v2)
                elif op == '/':
                    target = max(v1, v2) // min(v1, v2)
            else:
                op = rng.choice(['+', '*'])
                if op == '+':
                    target = sum(cage_vals)
                else:
                    prod = 1
                    for val in cage_vals:
                        prod *= val
                    target = prod
                    
            cages.append({
                'id': cage_id,
                'cells': cage_cells,
                'op': op,
                'target': int(target)
            })
            cage_id += 1
            
    return {
        'size': size,
        'cages': cages,
        'solution': grid
    }

@games_bp.route('/kenken/play', methods=['POST'])
def get_cond_ini_kenken():
    n = request.json.get('n')
    if n not in _VALID_KENKEN:
        return jsonify({'error': 'Tamaño inválido'}), 400
    seed = random.randint(0, 1000000)
    return jsonify(generate_kenken(n, seed))

@games_bp.route('/0h_h1/play', methods=['POST'])
def get_cond_ini():
    n = request.json.get('n')
    if n not in _VALID_0HH1:
        return jsonify({'error': 'Tamaño inválido'}), 400
    boards = BOARDS[f'aleatorios{n}']
    return jsonify({'matrix': boards[random.randint(0, len(boards) - 1)]})

@games_bp.route('/0h_n0/play', methods=['POST'])
def get_cond_ini_0h_n0():
    n = request.json.get('n')
    if n not in _VALID_0HN0:
        return jsonify({'error': 'Tamaño inválido'}), 400
    boards = BOARDS[f'ohno{n}']
    return jsonify({'matrix': boards[random.randint(0, len(boards) - 1)]})

@games_bp.route('/nerdle/play', methods=['POST'])
def get_cond_ini_nerdle():
    n = request.json.get('n')
    if n not in _VALID_NERDLE:
        return jsonify({'error': 'Tamaño inválido'}), 400
    boards = BOARDS[f'igualdades{n}']
    return jsonify({'equalities': boards[random.randint(0, len(boards) - 1)]})

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

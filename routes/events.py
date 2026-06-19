from flask import Blueprint, request, jsonify
from db import get_connection, release_connection

events_bp = Blueprint('events', __name__)


# ─── COMMENTS ────────────────────────────────────────────────────

@events_bp.route('/api/comments/<int:event_id>', methods=['GET'])
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


@events_bp.route('/api/comments/add', methods=['POST'])
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


# ─── REACTIONS ───────────────────────────────────────────────────

@events_bp.route('/api/reactions', methods=['GET'])
def get_all_reactions():
    user_id = request.args.get('userid', '')
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT
                event_id,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE userid = %s) > 0 AS reacted
            FROM reactions
            GROUP BY event_id;
        """, (user_id or None,))
        rows = cursor.fetchall()
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({row[0]: {'total': row[1], 'reacted': bool(row[2])} for row in rows})


@events_bp.route('/api/reactions/toggle', methods=['POST'])
def toggle_reaction():
    user_id = request.json.get('userid')
    event_id = request.json.get('event_id')
    if not user_id or not event_id:
        return jsonify({'success': False}), 400

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


# ─── RSVP ────────────────────────────────────────────────────────

@events_bp.route('/api/rsvp/<int:event_id>', methods=['GET'])
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


@events_bp.route('/api/rsvp/toggle', methods=['POST'])
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


# ─── Q&A ─────────────────────────────────────────────────────────

@events_bp.route('/api/questions/<int:event_id>', methods=['GET'])
def get_questions(event_id):
    user_id = request.args.get('userid', '')
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT q.id, n.nickname, q.content, q.created_at,
                   COUNT(qv.id) AS votes
            FROM questions q
            JOIN nickname n ON n.userid = q.userid
            LEFT JOIN question_votes qv ON qv.question_id = q.id
            WHERE q.event_id = %s
            GROUP BY q.id, n.nickname, q.content, q.created_at
            ORDER BY votes DESC, q.created_at ASC;
        """, (event_id,))
        rows = cursor.fetchall()

        voted_set = set()
        if user_id and rows:
            cursor.execute("""
                SELECT qv.question_id FROM question_votes qv
                JOIN questions q ON q.id = qv.question_id
                WHERE q.event_id = %s AND qv.userid = %s;
            """, (event_id, user_id))
            voted_set = {r[0] for r in cursor.fetchall()}

        questions = [{
            'id': r[0], 'nickname': r[1], 'content': r[2],
            'created_at': r[3].isoformat(), 'votes': r[4],
            'voted': r[0] in voted_set
        } for r in rows]
    finally:
        cursor.close()
        release_connection(connection)
    return jsonify({'questions': questions})


@events_bp.route('/api/questions/add', methods=['POST'])
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


@events_bp.route('/api/questions/vote', methods=['POST'])
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


# ─── NEWSLETTER ──────────────────────────────────────────────────

@events_bp.route('/api/subscribe', methods=['POST'])
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

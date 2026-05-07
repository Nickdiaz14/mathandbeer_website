from flask import Blueprint, render_template, request, json, Response, current_app, redirect
from db import get_connection, release_connection
import locale

pages_bp = Blueprint('pages', __name__)

@pages_bp.before_request
def redireccion_permanente():
    # Si el usuario entra por la URL de Render...
    if request.host == 'math-and-beer.onrender.com':
        # ...lo redirigimos al .com manteniendo la ruta en la que estaba
        return redirect('https://www.mathandbeer.com' + request.path , code=301)

@pages_bp.route('/sitemap.xml')
def sitemap():
    xml_content = render_template('sitemap.xml')
    return Response(xml_content, mimetype='text/xml')

@pages_bp.route('/robots.txt')
def robots_txt():
    return current_app.send_static_file('robots.txt')

@pages_bp.route('/')
def page_about():
    with open("static/json/equipo.json", "r", encoding="utf-8") as f:
        equipo = json.load(f)

    connection = get_connection()
    try:
        cursor = connection.cursor()
        
        cursor.execute("SELECT * FROM events WHERE date < CURRENT_TIMESTAMP ORDER BY date ASC;")
        charlas = cursor.fetchall()
        columnas = [col[0] for col in cursor.description]

        grouped = {}
        for row in charlas:
            c = dict(zip(columnas, row))
            year = c["date"].year
            locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
            c["date"] = c["date"].strftime("%A, %d de %B del %Y, %H:%M")
            grouped.setdefault(int(year), []).append(c)

        cursor.execute("""
            SELECT id, city, title, date
            FROM events WHERE date > CURRENT_TIMESTAMP
        """)
        
        proxima = cursor.fetchall()
        proxima = [{"id": evento[0], "city": evento[1], "title": evento[2], "date": evento[3].isoformat()} for evento in proxima]
    finally:
        cursor.close()
        release_connection(connection)

    if len(proxima) > 0:
        return render_template("index.html", charlas=grouped, miembros=equipo, n_charlas=len(charlas), proxima=json.dumps(proxima))
    return render_template("index.html", charlas=grouped, miembros=equipo, n_charlas=len(charlas))

@pages_bp.route('/leaderboards')
def page_leaderboards():
    return render_template('leaderboards.html', records=10)

@pages_bp.route('/menu_games')
def page_menu():
    id = request.args.get('userid')
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT nickname FROM nickname WHERE userid = %s;", (id,))
        row = cursor.fetchone()
        name = row[0] if row else "Guest"
    finally:
        cursor.close()
        release_connection(connection)

    return render_template('menu.html', nickname=name)

@pages_bp.route('/forms')
def page_forms():
    return render_template('forms.html')

@pages_bp.route('/register')
def page_register():
    try:
        m = request.args.get('m')
        return render_template('register.html', m=m)
    except:
        return render_template('register.html')

@pages_bp.route('/0h_h1')
def page_0hh1():
    n = request.args.get('n')
    with open("static/json/reglas.json", "r", encoding="utf-8") as f:
        reglas = json.load(f)
    return render_template('0h_h1.html', n=n, c=reglas[0]["0h-h1"])

@pages_bp.route('/0h_h1_tt')
def page_0hh1_tt():
    with open("static/json/reglas.json", "r", encoding="utf-8") as f:
        reglas = json.load(f)
    return render_template('0h_h1_tt.html', c=reglas[0]["0h-h1"])

@pages_bp.route('/tutorial_0h_h1')
def page_tutorial_0hh1():
    return render_template('tutorial_0h_h1.html')

@pages_bp.route('/knight')
def page_knight():
    with open("static/json/reglas.json", "r", encoding="utf-8") as f:
        reglas = json.load(f)
    return render_template('knight.html', c=reglas[0]["knight"])

@pages_bp.route('/secuenzo')
def page_secuenzo():
    n = int(request.args.get('n'))
    with open("static/json/reglas.json", "r", encoding="utf-8") as f:
        reglas = json.load(f)
    return render_template('secuenzo.html', n=n, c=reglas[0]["unicolor"] if n == 6 else reglas[0]["bicolor"])

@pages_bp.route('/cuentamania')
def page_cuentamania():
    n = int(request.args.get('n'))
    with open("static/json/reglas.json", "r", encoding="utf-8") as f:
        reglas = json.load(f)
    return render_template('cuentamania.html', c=reglas[0]["cuentamania"], n=n)

@pages_bp.route('/leaderboard')
def page_leaderboard():
    game = request.args.get('game')
    name = request.args.get('name')
    types = int(request.args.get('type', 0))
    better = request.args.get('better') == 'true'
    record_val = request.args.get('record')

    if better:
        message = '¡Felicidades, superaste tu record!'
    elif types == 1:
        if record_val is None:
            message = '¡Sigue así, pronto harás un nuevo record!'
        else:    
            record = int(record_val)
            message = f'¡Hiciste un tiempo de {(record//6000):02}:{((record%6000)//100):02}.{(record%100):02}, sigue así!'
    elif types == 2:
        record = float(record_val)
        message = f'¡Hiciste {round(record, 2)} puntos, sigue así!'
    else:
        record = int(record_val)
        message = f'¡Hiciste {record} tablero(s), sigue así!'

    return render_template('leaderboard.html', game=game, name=name, records=5, message=message, better=better)

@pages_bp.route('/profile')
def page_profile():
    return render_template('profile.html')

@pages_bp.route('/daily')
def page_daily():
    return render_template('daily.html')

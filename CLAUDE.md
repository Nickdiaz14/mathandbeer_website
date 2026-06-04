# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

Python 3.10+. No tests or linting tools are configured.

```bash
# Install dependencies
pip install -r requirements.txt

# Set up .env with DB credentials (see Environment Variables below)

# Run locally
python main.py
# Server starts at http://localhost:5000

# Production server
gunicorn main:app
```

The GitHub Actions workflow ([.github/workflows/sync.yml](.github/workflows/sync.yml)) uses a separate [github_actions_requirements.txt](github_actions_requirements.txt) for the weekly photo sync job.

## Environment Variables

Required in `.env`:
```
DB_HOST=<postgres host>
DB_USER=<postgres user>
DB_PASSWORD=<password>
DB_NAME=postgres
DB_PORT=5432
```

For Supabase (production), `DB_HOST` uses the pooler URL and `DB_USER` includes the project ref. SSL is enforced automatically when not on localhost.

## Architecture

**Entry points:**
- [main.py](main.py) — creates the Flask app and runs it
- [app.py](app.py) — app factory (`create_app()`), initializes the DB pool, registers blueprints

**Blueprints:**
- [routes/pages.py](routes/pages.py) — server-rendered HTML page routes
- [routes/games.py](routes/games.py) — board fetching (`/0h_h1/play`, `/0h_n0/play`, `/nerdle/play`) and leaderboard submit/consult
- [routes/daily.py](routes/daily.py) — daily challenge (`/api/daily`, `/api/daily/submit`, `/api/daily/leaderboard`, `/api/streak`), `DAILY_GAMES` config, and `_calculate_streak()` helper
- [routes/users.py](routes/users.py) — user creation, profile, nickname update, badges; imports `_calculate_streak` from `routes.daily`
- [routes/events.py](routes/events.py) — comments, reactions, RSVP, Q&A, newsletter subscribe
- [routes/attendance.py](routes/attendance.py) — post-event attendance form

**Database:**
- [db.py](db.py) — `psycopg2` connection pool (min 1, max 40 connections); use `get_db_connection()` / `release_db_connection()` around every query
- No ORM — all queries use raw SQL via `cursor.execute()`. No migration system; schema is managed externally in Supabase.
- All DB interactions must follow this pattern:
  ```python
  connection = get_db_connection()
  try:
      cursor = connection.cursor()
      cursor.execute("...", (param,))
      connection.commit()
  except Exception as e:
      connection.rollback()
      return jsonify({'error': str(e)}), 500
  finally:
      cursor.close()
      release_db_connection(connection)
  ```

**Frontend:**
- HTML templates live in [templates/](templates/) (Jinja2); [templates/base_game.html](templates/base_game.html) is the base layout for all games
- Each game has its own JS file in [static/scripts/](static/scripts/) and CSS in [static/css/](static/css/)
- [static/scripts/utils.js](static/scripts/utils.js) — shared helpers: `showAnimatedCountdown()`, `updateTimerDisplay()` (centisecond MM:SS.CS format), `isDailyMode()` (detects `?daily=true`), `setupGameControls()`, `showToast()`
- Pre-generated game boards are stored as `.txt` files in [static/boards/](static/boards/) and read at startup; each line is a board state parsed with `ast.literal_eval()`
- Static content (rules, team, partners, blog articles) lives in [static/json/](static/json/)

## Key Concepts

**User identity:** No traditional auth. Users get a UUID stored in `localStorage`; this `userid` is passed in every API request. Nicknames are optional and stored in the `nickname` table.

**Games:** 7 games with multiple size variants — 0h-h1 (4/6/8/10), 0h-n0 (4/5), Salto Real/Knight, Secuenzo, CuentaManía (S/M/L), Nerdle (6/8/10 digits). Boards are seeded from pre-generated text files in [static/boards/](static/boards/).

**Game JS lifecycle:** countdown → fetch board from API → start timer → game logic → submit result → show ranking modal. The `?daily=true` query param switches any game into daily mode (board is deterministic, result goes to `daily_results`).

**Daily challenge:** `DAILY_GAMES` list in [routes/daily.py](routes/daily.py) defines the rotation across 13 game variants. Board selection uses an MD5 hash of `date.today()` as a deterministic seed — same board for all users each day. Streak calculation is done in `_calculate_streak()` — no DB column, computed from raw `daily_results` dates.

**Leaderboards:** Rankings use `leader_final_view` (a DB view joining `leaderboard` + `nickname`). Scores are stored raw; ranking direction (ASC/DESC) depends on the game type.

**Badges:** 7 badge types (novato, tertuliano, fan, calculadora, leyenda, racha7, racha30) computed on-demand via DB queries in `GET /api/badges/<userid>` — not stored as a column.

**Events system:** Events have RSVP, comments, reactions ("brindis"), and Q&A with upvotes. Tables: `events`, `attendance`, `comments`, `reactions`, `questions`, `question_votes`, `rsvp`.

**Photo sync:** A GitHub Actions workflow ([.github/workflows/sync.yml](.github/workflows/sync.yml)) runs weekly to pull event photos from Google Drive into [static/images/events/](static/images/events/). Thumbnails are 440×300 WebP generated by [generate_thumbs.py](generate_thumbs.py).

**Admin:** Five hardcoded UUIDs in `ADMINS` list in [routes/users.py](routes/users.py) have access to aggregate stats endpoints (`tops_1`, `tops_2`) returned inside the profile API response.

## Database Tables

| Table | Purpose |
|---|---|
| `nickname` | userid → nickname mapping |
| `leaderboard` | Per-game personal records |
| `daily_results` | Daily challenge submissions per user/date |
| `events` | Math & Beer talk events |
| `attendance` | Post-event survey responses |
| `comments` / `reactions` / `questions` / `question_votes` | Community interaction on events |
| `rsvp` | Event attendance signups |
| `subscribers` | Newsletter emails |
| `testimonials` | Event testimonials |
| `leader_final_view` | DB view for ranked leaderboard display |

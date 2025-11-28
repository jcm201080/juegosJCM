# app.py
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from db import get_connection, init_db
import hashlib
import sqlite3

app = Flask(__name__)
CORS(app)

# Inicializar base de datos
with app.app_context():
    init_db()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


# =========================
#   RUTAS PRINCIPALES
# =========================
@app.route("/")
def home():
    # Portada Juegos JCM
    return render_template("home.html")


@app.route("/juego-mate")
def juego_mate():
    # Aquí usamos tu index.html actual del juego
    return render_template("index.html")



# =========================
#      REGISTRO
# =========================
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"success": False, "error": "Usuario y contraseña requeridos"}), 400

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, hash_password(password)),
        )
        conn.commit()
        user_id = cur.lastrowid

        # obtener usuario
        cur.execute(
            "SELECT id, username, best_score, total_score, level_unlocked FROM users WHERE id = ?",
            (user_id,),
        )
        row = cur.fetchone()
        user = dict(row) if row else None

        return jsonify({"success": True, "user": user})

    except sqlite3.IntegrityError:
        return jsonify({"success": False, "error": "Nombre de usuario ya existe"}), 409

    finally:
        conn.close()


# =========================
#        LOGIN
# =========================
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"success": False, "error": "Usuario y contraseña requeridos"}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, username, best_score, total_score, level_unlocked, password_hash
        FROM users
        WHERE username = ?
        """,
        (username,),
    )
    row = cur.fetchone()
    conn.close()

    if row is None:
        return jsonify({"success": False, "error": "Usuario no encontrado"}), 404

    if hash_password(password) != row["password_hash"]:
        return jsonify({"success": False, "error": "Contraseña incorrecta"}), 401

    user = {
        "id": row["id"],
        "username": row["username"],
        "best_score": row["best_score"],
        "total_score": row["total_score"],
        "level_unlocked": row["level_unlocked"],
    }

    return jsonify({"success": True, "user": user})


# =========================
#   GUARDAR SCORE
# =========================
@app.route("/api/score", methods=["POST"])
def save_score():
    data = request.get_json()
    user_id = data.get("user_id")
    score = data.get("score")
    level = data.get("level", 1)  # nivel por defecto

    if user_id is None or score is None:
        return jsonify({"success": False, "error": "user_id y score requeridos"}), 400

    conn = get_connection()
    cur = conn.cursor()

    # obtener datos previos del usuario
    cur.execute("SELECT best_score, total_score FROM users WHERE id = ?", (user_id,))
    row = cur.fetchone()

    if row is None:
        conn.close()
        return jsonify({"success": False, "error": "Usuario no encontrado"}), 404

    current_best = row["best_score"] or 0
    current_total = row["total_score"] or 0

    # 1️⃣ Registrar la partida en "scores"
    cur.execute(
        "INSERT INTO scores (user_id, level, score) VALUES (?, ?, ?)",
        (user_id, level, score),
    )

    # 2️⃣ Actualizar acumulado global del usuario
    new_total = current_total + score

    # 3️⃣ Actualizar mejor puntuación global (en tabla users)
    new_best = max(current_best, score)
    cur.execute(
        "UPDATE users SET best_score = ?, total_score = ? WHERE id = ?",
        (new_best, new_total, user_id),
    )

    # 4️⃣ Mejores puntuaciones por nivel (para ese usuario)
    cur.execute(
        """
        SELECT level, MAX(score) AS best_score_level
        FROM scores
        WHERE user_id = ?
        GROUP BY level
        """,
        (user_id,),
    )
    rows_lvl = cur.fetchall()
    per_level_best = {row["level"]: row["best_score_level"] for row in rows_lvl}

    # 5️⃣ Ranking global (top 10) usando scores agregados
    cur.execute(
        """
        SELECT u.username, MAX(s.score) AS best_score
        FROM users u
        JOIN scores s ON s.user_id = u.id
        GROUP BY u.id
        ORDER BY best_score DESC
        LIMIT 10
        """
    )
    ranking_rows = cur.fetchall()

    conn.commit()
    conn.close()

    ranking = [
        {"username": r["username"], "best_score": r["best_score"]}
        for r in ranking_rows
    ]

    return jsonify(
        {
            "success": True,
            "updated": (score > current_best),
            "best_score": new_best,
            "total_score": new_total,
            "per_level_best": per_level_best,
            "ranking": ranking,
        }
    )


# =========================
#       RANKING
# =========================
@app.route("/api/ranking", methods=["GET"])
def ranking():
    """
    Ranking global:
      GET /api/ranking

    Ranking por nivel:
      GET /api/ranking?level=2
    """
    level_param = request.args.get("level", type=int)

    conn = get_connection()
    cur = conn.cursor()

    if level_param is None:
        # 🔹 Ranking global: mejor puntuación de cada usuario (en cualquier nivel)
        cur.execute(
            """
            SELECT u.username,
                   MAX(s.score) AS best_score,
                   COUNT(s.id) AS games_played,
                   MAX(s.created_at) AS last_game
            FROM users u
            JOIN scores s ON s.user_id = u.id
            GROUP BY u.id
            ORDER BY best_score DESC
            LIMIT 10
            """
        )
    else:
        # 🔹 Ranking por nivel concreto
        cur.execute(
            """
            SELECT u.username,
                   MAX(s.score) AS best_score,
                   COUNT(s.id) AS games_played,
                   MAX(s.created_at) AS last_game
            FROM users u
            JOIN scores s ON s.user_id = u.id
            WHERE s.level = ?
            GROUP BY u.id
            ORDER BY best_score DESC
            LIMIT 10
            """,
            (level_param,),
        )

    rows = cur.fetchall()
    conn.close()

    ranking = []
    for r in rows:
        ranking.append(
            {
                "username": r["username"],
                "best_score": r["best_score"],
                "games_played": r["games_played"],
                "last_game": r["last_game"],
            }
        )

    return jsonify({"success": True, "ranking": ranking})

# =========================
#       HISTORIAL USUARIO
# =========================
@app.route("/api/history/<int:user_id>", methods=["GET"])
def user_history(user_id):
    """
    Devuelve las últimas partidas de un usuario concreto.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT level, score, created_at
        FROM scores
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 20
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    conn.close()

    history = [
        {
            "level": r["level"],
            "score": r["score"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]

    return jsonify({"success": True, "history": history})


# =========================
#       RUN SERVIDOR
# =========================
if __name__ == "__main__":
    app.run(debug=True)

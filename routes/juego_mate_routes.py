# routes/juego_mate_routes.py
from flask import Blueprint, request, jsonify
from db import get_connection
from routes.auth_routes import login_required
from flask import session




game_bp = Blueprint("game", __name__)

# =========================
#   GUARDAR SCORE (juego mate)
# =========================
@game_bp.route("/api/score", methods=["POST"])
@login_required
def save_score():
    data = request.get_json() or {}
    user_id = session.get("user_id")
    score = data.get("score")
    level = data.get("level", 1)

    if user_id is None or score is None:
        return jsonify({"success": False, "error": "user_id y score requeridos"}), 400

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT best_score, total_score FROM users WHERE id = ?", (user_id,))
    row = cur.fetchone()

    if row is None:
        conn.close()
        return jsonify({"success": False, "error": "Usuario no encontrado"}), 404

    current_best = row["best_score"] or 0
    current_total = row["total_score"] or 0

    # Registrar partida
    cur.execute(
        "INSERT INTO scores (user_id, level, score) VALUES (?, ?, ?)",
        (user_id, level, score),
    )

    new_total = current_total + score
    new_best = max(current_best, score)

    cur.execute(
        "UPDATE users SET best_score = ?, total_score = ? WHERE id = ?",
        (new_best, new_total, user_id),
    )

    # Mejores por nivel
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

    # Ranking global top10
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
#       RANKING juego mate
# =========================
@game_bp.route("/api/ranking", methods=["GET"])
def ranking():
    level_param = request.args.get("level", type=int)

    conn = get_connection()
    cur = conn.cursor()

    if level_param is None:
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

    ranking = [
        {
            "username": r["username"],
            "best_score": r["best_score"],
            "games_played": r["games_played"],
            "last_game": r["last_game"],
        }
        for r in rows
    ]

    return jsonify({"success": True, "ranking": ranking})

# =========================
#       HISTORIAL juego mate
# =========================
@game_bp.route("/api/history/<int:user_id>", methods=["GET"])
@login_required
def user_history(user_id):
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

# routes/english_games_routes.py

from flask import Blueprint, render_template, request, jsonify, session
from db import get_connection

english_games_bp = Blueprint("english_games", __name__)


# 🔹 Página del juego
@english_games_bp.route("/english-games")
def english_games():
    return render_template("english_games.html")


# 🔹 Guardar puntuación del juego de colores en inglés
@english_games_bp.route("/api/english-colors/save-score", methods=["POST"])
def save_english_colors_score():
    # Comprobar que hay usuario logueado
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "not_logged_in"}), 401

    data = request.get_json(silent=True) or {}

    level = int(data.get("level", 1))
    score = int(data.get("score", 0))
    duration_sec = int(data.get("duration_sec", 0))

    conn = get_connection()
    cur = conn.cursor()

    # Insertar partida
    cur.execute(
        """
        INSERT INTO english_color_scores (user_id, level, score, duration_sec)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, level, score, duration_sec),
    )
    conn.commit()

    # Mejor puntuación global de este juego
    cur.execute(
        "SELECT COALESCE(MAX(score), 0) FROM english_color_scores WHERE user_id = ?",
        (user_id,),
    )
    best_global = cur.fetchone()[0] or 0

    # Puntuación acumulada en este juego
    cur.execute(
        "SELECT COALESCE(SUM(score), 0) FROM english_color_scores WHERE user_id = ?",
        (user_id,),
    )
    total_score = cur.fetchone()[0] or 0

    # Mejor puntuación en este nivel concreto
    cur.execute(
        """
        SELECT COALESCE(MAX(score), 0)
        FROM english_color_scores
        WHERE user_id = ? AND level = ?
        """,
        (user_id, level),
    )
    best_level = cur.fetchone()[0] or 0

    conn.close()

    return jsonify(
        {
            "ok": True,
            "best_global": best_global,
            "total_score": total_score,
            "best_level": best_level,
        }
    )
@english_games_bp.route("/api/english-colors/ranking")
def english_colors_ranking():
    conn = get_connection()
    cur = conn.cursor()

    # Top 10 por mejor puntuación global en este juego
    cur.execute(
        """
        SELECT u.username,
               MAX(s.score) AS best_score,
               COUNT(*)     AS games_played
        FROM english_color_scores s
        JOIN users u ON u.id = s.user_id
        GROUP BY s.user_id
        ORDER BY best_score DESC
        LIMIT 10
        """
    )
    rows = cur.fetchall()
    conn.close()

    ranking = []
    for idx, row in enumerate(rows, start=1):
        ranking.append(
            {
                "position": idx,
                "username": row["username"],
                "best_score": row["best_score"],
                "games_played": row["games_played"],
            }
        )

    return jsonify({"ok": True, "ranking": ranking})

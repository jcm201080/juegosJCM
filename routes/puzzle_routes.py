# routes/puzzle_routes.py
from flask import Blueprint, request, jsonify
from db import get_connection

puzzle_bp = Blueprint("puzzle", __name__)

# 🔹 Función para calcular puntuación del puzzle
def compute_puzzle_score(solved: int, total_eq: int,
                         mistakes: int, lives_left: int,
                         duration_sec: int) -> int:
    base = solved * 100          # 100 puntos por operación correcta
    penalty_mistakes = mistakes * 15
    bonus_lives = lives_left * 20
    penalty_time = duration_sec // 5  # -1 punto cada 5 segundos

    return max(0, base + bonus_lives - penalty_mistakes - penalty_time)

# =========================
#   PUZZLE: GUARDAR PARTIDA
# =========================
@puzzle_bp.route("/api/puzzle_score", methods=["POST"])
def save_puzzle_score():
    data = request.get_json() or {}

    user_id = data.get("user_id")
    difficulty = (data.get("difficulty") or "").strip()
    solved = data.get("solved")
    total_eq = data.get("total_eq")
    mistakes = data.get("mistakes")
    lives_left = data.get("lives_left")
    duration_sec = data.get("duration_sec")

    if (
        user_id is None or
        not difficulty or
        solved is None or
        total_eq is None or
        mistakes is None or
        lives_left is None or
        duration_sec is None
    ):
        return jsonify({
            "success": False,
            "error": "Faltan campos (user_id, difficulty, solved, total_eq, mistakes, lives_left, duration_sec)."
        }), 400

    try:
        solved = int(solved)
        total_eq = int(total_eq)
        mistakes = int(mistakes)
        lives_left = int(lives_left)
        duration_sec = int(duration_sec)
        user_id = int(user_id)
    except ValueError:
        return jsonify({
            "success": False,
            "error": "Los campos numéricos deben ser enteros."
        }), 400

    score = compute_puzzle_score(solved, total_eq, mistakes, lives_left, duration_sec)

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            INSERT INTO puzzle_scores
            (user_id, difficulty, solved, total_eq, mistakes, lives_left, duration_sec, score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, difficulty, solved, total_eq, mistakes, lives_left, duration_sec, score),
        )

        cur.execute(
            """
            SELECT MAX(score) AS best_global
            FROM puzzle_scores
            WHERE user_id = ?
            """,
            (user_id,),
        )
        row_global = cur.fetchone()
        best_global = row_global["best_global"] or 0

        cur.execute(
            """
            SELECT MAX(score) AS best_diff
            FROM puzzle_scores
            WHERE user_id = ? AND difficulty = ?
            """,
            (user_id, difficulty),
        )
        row_diff = cur.fetchone()
        best_difficulty = row_diff["best_diff"] or 0

        conn.commit()
    finally:
        conn.close()

    return jsonify({
        "success": True,
        "score": score,
        "best_global": best_global,
        "best_difficulty": best_difficulty,
    })

# =========================
#   PUZZLE: RANKING
# =========================
@puzzle_bp.route("/api/puzzle_ranking", methods=["GET"])
def puzzle_ranking():
    difficulty = request.args.get("difficulty", type=str)

    conn = get_connection()
    cur = conn.cursor()

    if difficulty:
        cur.execute(
            """
            SELECT u.username,
                   MAX(p.score) AS best_score,
                   COUNT(p.id) AS games_played,
                   MAX(p.created_at) AS last_game
            FROM users u
            JOIN puzzle_scores p ON p.user_id = u.id
            WHERE p.difficulty = ?
            GROUP BY u.id
            ORDER BY best_score DESC
            LIMIT 10
            """,
            (difficulty,),
        )
    else:
        cur.execute(
            """
            SELECT u.username,
                   MAX(p.score) AS best_score,
                   COUNT(p.id) AS games_played,
                   MAX(p.created_at) AS last_game
            FROM users u
            JOIN puzzle_scores p ON p.user_id = u.id
            GROUP BY u.id
            ORDER BY best_score DESC
            LIMIT 10
            """
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
#   PUZZLE: HISTORIAL USUARIO
# =========================
@puzzle_bp.route("/api/puzzle_history/<int:user_id>", methods=["GET"])
def puzzle_history(user_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT difficulty, solved, total_eq, mistakes, lives_left,
               duration_sec, score, created_at
        FROM puzzle_scores
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
            "difficulty": r["difficulty"],
            "solved": r["solved"],
            "total_eq": r["total_eq"],
            "mistakes": r["mistakes"],
            "lives_left": r["lives_left"],
            "duration_sec": r["duration_sec"],
            "score": r["score"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]

    return jsonify({"success": True, "history": history})

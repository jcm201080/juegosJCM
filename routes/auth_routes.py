# routes/auth_routes.py
from flask import Blueprint, request, jsonify, session
from db import get_connection
import hashlib
import sqlite3

auth_bp = Blueprint("auth", __name__)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

# =========================
#      REGISTRO
# =========================
@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json() or {}
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

        # ✅ Dejar logueado tras registro
        session["user_id"] = user_id
        session.permanent = True  # opcional

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
@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
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

    # ✅ Guardar sesión (esto es lo clave)
    session["user_id"] = row["id"]
    session.permanent = True  # opcional

    user = {
        "id": row["id"],
        "username": row["username"],
        "best_score": row["best_score"],
        "total_score": row["total_score"],
        "level_unlocked": row["level_unlocked"],
    }

    return jsonify({"success": True, "user": user})

# (Opcional pero MUY útil) Logout para limpiar sesión
@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    session.pop("user_id", None)
    return jsonify({"success": True})


@auth_bp.route("/api/me", methods=["GET"])
def me():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"logged_in": False}), 200

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, username, best_score, total_score, level_unlocked FROM users WHERE id = ?",
        (user_id,),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        session.pop("user_id", None)
        return jsonify({"logged_in": False}), 200

    return jsonify({"logged_in": True, "user": dict(row)}), 200

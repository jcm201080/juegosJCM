# users.py
from db import get_connection
import sqlite3
import hashlib


def hash_password(password: str) -> str:
    """Devuelve el hash SHA-256 de la contraseña (demo, no producción)."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def register_user():
    print("\n📝 Registro de nuevo usuario")
    username = input("Elige un nombre de usuario: ").strip()
    password = input("Elige una contraseña: ").strip()

    if not username or not password:
        print("❌ Usuario y contraseña no pueden estar vacíos.")
        return None

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, hash_password(password)),
        )
        conn.commit()
        user_id = cur.lastrowid
        print(f"✅ Usuario '{username}' creado correctamente.\n")

        # Devolvemos el usuario recién creado
        cur.execute(
            "SELECT id, username, best_score, level_unlocked FROM users WHERE id = ?",
            (user_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None

    except sqlite3.IntegrityError:
        print("❌ Ese nombre de usuario ya existe. Prueba con otro.")
        return None

    finally:
        conn.close()


def login_user():
    print("\n🔐 Inicio de sesión")
    username = input("Usuario: ").strip()
    password = input("Contraseña: ").strip()

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, username, best_score, level_unlocked, password_hash
        FROM users
        WHERE username = ?
        """,
        (username,),
    )
    row = cur.fetchone()
    conn.close()

    if row is None:
        print("❌ Usuario no encontrado.")
        return None

    hashed_input = hash_password(password)
    if hashed_input != row["password_hash"]:
        print("❌ Contraseña incorrecta.")
        return None

    print(f"✅ Bienvenido, {row['username']}.\n")
    # Devolvemos sólo los datos que nos interesan en el juego
    return {
        "id": row["id"],
        "username": row["username"],
        "best_score": row["best_score"],
        "level_unlocked": row["level_unlocked"],
    }


def refresh_user(user_id: int):
    """Vuelve a leer los datos del usuario desde la BD (por si cambia puntuación/nivel)."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, username, best_score, level_unlocked FROM users WHERE id = ?",
        (user_id,),
    )
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None

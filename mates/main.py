# main.py
from db import init_db
from users import register_user, login_user, refresh_user
from game import start_game


def menu_not_logged():
    print("\n===== MENÚ PRINCIPAL =====")
    print("1. Registrarse")
    print("2. Iniciar sesión")
    print("3. Salir")


def menu_logged(user):
    print("\n===== MENÚ DEL JUGADOR =====")
    print(f"👤 Usuario: {user['username']}")
    print(f"⭐ Mejor puntuación: {user['best_score']}")
    print(f"🎚 Nivel desbloqueado: {user['level_unlocked']}")
    print("---------------------------")
    print("1. Jugar partida")
    print("2. Actualizar / ver perfil")
    print("3. Cerrar sesión")
    print("4. Salir")


def main():
    # Creamos la BD si no existe
    init_db()

    current_user = None
    running = True

    while running:
        if current_user is None:
            menu_not_logged()
            option = input("Elige una opción: ").strip()

            if option == "1":
                user = register_user()
                if user:  # Si se ha creado bien, lo dejamos logueado
                    current_user = user
            elif option == "2":
                user = login_user()
                if user:
                    current_user = user
            elif option == "3":
                print("👋 Saliendo del juego. ¡Hasta otra!")
                running = False
            else:
                print("❌ Opción no válida.")

        else:
            menu_logged(current_user)
            option = input("Elige una opción: ").strip()

            if option == "1":
                # Aquí jugamos una partida
                start_game(current_user)
                # Después podríamos actualizar puntuación/nivel y refrescar desde BD
                refreshed = refresh_user(current_user["id"])
                if refreshed:
                    current_user = refreshed

            elif option == "2":
                refreshed = refresh_user(current_user["id"])
                if refreshed:
                    current_user = refreshed
                print("\n📊 Perfil actual:")
                print(f"- Usuario: {current_user['username']}")
                print(f"- Mejor puntuación: {current_user['best_score']}")
                print(f"- Nivel desbloqueado: {current_user['level_unlocked']}")

            elif option == "3":
                print(f"🔓 Cerrando sesión de {current_user['username']}...")
                current_user = None

            elif option == "4":
                print("👋 Saliendo del juego. ¡Hasta otra!")
                running = False

            else:
                print("❌ Opción no válida.")

if __name__ == "__main__":
    main()

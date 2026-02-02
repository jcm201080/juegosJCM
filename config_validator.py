REQUIRED_CONFIG = [
    "SECRET_KEY",
    "ONLINE_COUNTDOWN_SECONDS",
    "ONLINE_MAX_PLAYERS",
]

def validate_config(config_module):
    missing = []

    for key in REQUIRED_CONFIG:
        if not hasattr(config_module, key):
            missing.append(key)

    if missing:
        raise RuntimeError(
            "\n❌ Configuración incompleta\n"
            f"Faltan variables en config.py: {', '.join(missing)}\n"
            "👉 Copia config.example.py y revisa valores\n"
        )

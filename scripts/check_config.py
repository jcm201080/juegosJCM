import sys
import config

REQUIRED = [
    "SECRET_KEY",
    "ONLINE_COUNTDOWN_SECONDS",
    "ONLINE_MAX_PLAYERS",
]

missing = [k for k in REQUIRED if not hasattr(config, k)]

if missing:
    print("❌ ERROR: Configuración incompleta")
    print("Faltan:", ", ".join(missing))
    sys.exit(1)

print("✅ Configuración OK")

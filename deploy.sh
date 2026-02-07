#!/bin/bash
set -e

# Ir al root del proyecto
cd /var/www/juegos

# Asegurar que Python ve el proyecto
export PYTHONPATH=/var/www/juegos

echo "🔍 Comprobando config..."
./venv/bin/python scripts/check_config.py

echo "🚀 Reiniciando servicio..."
systemctl restart juegos

echo "✅ Deploy completado"

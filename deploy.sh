#!/bin/bash
set -e

echo "🔍 Comprobando config..."
python scripts/check_config.py

echo "🚀 Reiniciando servicio..."
sudo systemctl restart juegos

echo "✅ Deploy completado"

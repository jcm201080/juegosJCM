# config.py
import os
from dotenv import load_dotenv

load_dotenv()

BINGO_MIN_PLAYERS = int(os.getenv("BINGO_MIN_PLAYERS", 1))
BINGO_MAX_PLAYERS = int(os.getenv("BINGO_MAX_PLAYERS", 8))

BINGO_MIN_CARTONES = 1
BINGO_MAX_CARTONES = 4

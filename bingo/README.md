bingo/
├── __init__.py
│
├── classic/                   # Bingo Local (NO TOCAR)
│   ├── logic/
│   │   ├── cartones.py
│   │   ├── bolas.py
│   │   └── validaciones.py
│   └── img/
│
├── bingo_online/               # Bingo Online
│   ├── state.py                # Estado global (lobby y salas)
│   │
│   ├── logic/
│   │   ├── cartones.py         # Generación de cartones
│   │   ├── bolas.py            # Bombo online
│   │   └── validaciones.py     # Validaciones (línea, cruz, bingo)
│   │
│   ├── routes/
│   │   └── bingo_online_routes.py   # Rutas Flask del bingo online
│   │
│   ├── sockets/
│   │   └── bingo_online_socket.py   # Eventos Socket.IO online
│   │
│   ├── templates/
│   │   ├── bingo_home.html      # Entrada al modo online
│   │   ├── bingo_lobby.html     # Lobby online
│   │   └── sala/
│   │       └── bingo_sala_online.html  # Sala online
│
└── README.md


static/
├── css/
│   ├── bingo.css               # Estilos base del bingo
│   └── bingo_online.css        # Estilos específicos del online
│
├── js/
│   └── bingo/
│       ├── lobby.js            # Lobby clásico (local)
│       ├── online_lobby.js     # Lobby online
│       ├── sala.js             # Sala base (local)
│       ├── online_sala.js      # Sala online
│       └── cartones.js         # Renderizado de cartones
│
├── img/
│   └── bingo/
│       └── bingo.mp4 / imágenes
│
└── sounds/
    └── bingo_ball.mp3

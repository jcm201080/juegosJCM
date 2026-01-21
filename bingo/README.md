# 🎱 Bingo Online – Juegos JCM

Este módulo contiene toda la **lógica, rutas y sockets** del juego de Bingo Online
del proyecto **Juegos JCM**.

El objetivo es mantener el código del bingo **aislado y organizado**, sin mezclarlo
con el resto de juegos del proyecto.

---

## 📁 Estructura del módulo

```text
bingo/
├── __init__.py
├── routes/
│   └── bingo_routes.py        # Rutas Flask (lobby y sala)
├── sockets/
│   └── bingo_socket.py        # Eventos Socket.IO del bingo
├── logic/
│   ├── cartones.py            # Generación de cartones
│   ├── bolas.py               # Bombo y bolas
│   └── validaciones.py        # Validaciones de bingo
├── templates/
│   ├── bingo_lobby.html       # Pantalla de crear/unirse a sala
│   └── bingo_sala.html        # Sala de juego


---

## 🎨 Archivos estáticos del Bingo

Por diseño de Flask, los archivos estáticos del proyecto se sirven **únicamente**
desde la carpeta `static/` situada en la raíz del proyecto.

Por este motivo, los archivos CSS, JavaScript e imágenes del Bingo **no están
dentro del módulo `bingo/`**, sino en las siguientes rutas globales:

```text
static/
├── css/
│   └── bingo.css              # Estilos del Bingo
├── js/
│   └── bingo/
│       ├── lobby.js           # Lógica del lobby
│       ├── sala.js            # Lógica de la sala
│       └── cartones.js        # Renderizado de cartones
├── img/
│   └── bingo/                 # Imágenes del Bingo

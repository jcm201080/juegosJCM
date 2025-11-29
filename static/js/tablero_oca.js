document.addEventListener("DOMContentLoaded", function() {
    const tablero = document.getElementById("tablero");
    const salidaDiv = document.getElementById("salida");
    const salidaFichasDiv = document.getElementById("salida-fichas"); // 👈 NUEVO
    const tirarDadoBtn = document.getElementById("tirarDado");
    const estadoJuego = document.getElementById("estadoJuego");
    const numJugadoresInput = document.getElementById("numJugadores");
    const iniciarJuegoBtn = document.getElementById("iniciarJuego");
    const nombresJugadoresDiv = document.getElementById("nombresJugadores");
    const btnMostrarReglas = document.getElementById("mostrarReglas");
    const contenedorReglas = document.querySelector(".reglas");

    if (!tablero || !tirarDadoBtn || !estadoJuego || !numJugadoresInput || !iniciarJuegoBtn) {
        return;
    }

    let jugadores = [];
    let turno = 0;
    let juegoTerminado = false;
    let jugadoresPenalizados = new Set();

    tirarDadoBtn.disabled = true;

    iniciarJuegoBtn.addEventListener("click", function() {
        const numJugadores = parseInt(numJugadoresInput.value);
        if (isNaN(numJugadores) || numJugadores < 1 || numJugadores > 6) {
            alert("El número de jugadores debe estar entre 1 y 6.");
            return;
        }

        nombresJugadoresDiv.innerHTML = "";
        jugadores = [];

        for (let i = 0; i < numJugadores; i++) {
            const input = document.createElement("input");
            input.type = "text";
            input.placeholder = `Nombre del jugador ${i + 1}`;
            input.classList.add("nombreJugador");
            nombresJugadoresDiv.appendChild(input);
        }

        const confirmarBtn = document.createElement("button");
        confirmarBtn.textContent = "Confirmar nombres";
        confirmarBtn.classList.add("btn-confirmar-jugadores");
        confirmarBtn.addEventListener("click", iniciarPartida);
        nombresJugadoresDiv.appendChild(confirmarBtn);
    });

    function iniciarPartida() {
        const inputs = document.querySelectorAll(".nombreJugador");
        jugadores = [];

        inputs.forEach((input, i) => {
            let nombre = input.value.trim();
            if (nombre === "") nombre = `Jugador ${i + 1}`;
            jugadores.push({ nombre, posicion: -1, ficha: null });
        });

        tablero.innerHTML = "";
        turno = 0;
        juegoTerminado = false;
        jugadoresPenalizados.clear();
        estadoJuego.textContent = "";

        // 🔄 limpiar también las fichas de salida
        if (salidaFichasDiv) {
            salidaFichasDiv.innerHTML = "";
        }

        for (let i = 1; i <= 35; i++) {
            const casilla = document.createElement("div");
            casilla.classList.add("casilla");

            const numero = document.createElement("span");
            numero.classList.add("numero");
            numero.textContent = i;
            casilla.appendChild(numero);

            if (i === 12 || i === 19) {
                casilla.classList.add("penalizacion");
            } else if (i === 4 || i === 22) {
                casilla.classList.add("especial");
            }

            tablero.appendChild(casilla);
        }

        // Fichas en SALIDA
        jugadores.forEach((jugador, index) => {
            const ficha = document.createElement("div");
            ficha.classList.add("ficha");
            ficha.textContent = jugador.nombre;
            ficha.style.backgroundColor = `hsl(${index * 60}, 70%, 50%)`;
            jugador.ficha = ficha;
            jugador.posicion = -1;

            if (salidaFichasDiv) {           // 👈 AQUÍ EL CAMBIO
                salidaFichasDiv.appendChild(ficha);
            }
        });

        tirarDadoBtn.disabled = false;
        estadoJuego.textContent = "Partida iniciada. Empieza " + jugadores[0].nombre;
    }

    function moverJugador(jugador, pasos) {
        // Quitar ficha de donde esté
        if (jugador.posicion >= 0) {
            const casillaActual = tablero.children[jugador.posicion];
            if (casillaActual && casillaActual.contains(jugador.ficha)) {
                casillaActual.removeChild(jugador.ficha);
            }
        } else {
            // Está en SALIDA
            if (salidaFichasDiv && salidaFichasDiv.contains(jugador.ficha)) { // 👈 CAMBIO
                salidaFichasDiv.removeChild(jugador.ficha);
            }
        }

        let nuevaPosicion = jugador.posicion + pasos;
        const casillaFinal = 34;

        if (nuevaPosicion > casillaFinal) {
            let exceso = nuevaPosicion - casillaFinal;
            nuevaPosicion = casillaFinal - exceso;
            estadoJuego.textContent = `${jugador.nombre} saca un ${pasos} y rebota, retrocede a la casilla ${nuevaPosicion + 1}.`;
        }

        jugador.posicion = nuevaPosicion;
        const numeroCasilla = jugador.posicion + 1;

        if (jugador.posicion === casillaFinal) {
            estadoJuego.textContent = `${jugador.nombre} ha ganado el juego 🎉`;
            juegoTerminado = true;
            tirarDadoBtn.disabled = true;

            const casillaGanadora = tablero.children[jugador.posicion];
            if (casillaGanadora) {
                casillaGanadora.appendChild(jugador.ficha);
            }
            return false;
        }

        if (numeroCasilla === 12 || numeroCasilla === 19) {
            estadoJuego.textContent = `${jugador.nombre} cae en una casilla de penalización y pierde un turno. ☠️`;
            jugadoresPenalizados.add(jugador.nombre);
        } else if (numeroCasilla === 4 || numeroCasilla === 22) {
            estadoJuego.textContent = `${jugador.nombre} cae en una casilla especial y avanza 2 casillas más ✨`;
            jugador.posicion = Math.min(jugador.posicion + 2, casillaFinal);
        }

        const nuevaCasilla = tablero.children[jugador.posicion];
        if (nuevaCasilla) {
            nuevaCasilla.appendChild(jugador.ficha);
        }

        return true;
    }

    function tirarDado() {
        return Math.floor(Math.random() * 6) + 1;
    }

    tirarDadoBtn.addEventListener("click", function() {
        if (juegoTerminado) return;
        if (jugadores.length === 0) {
            estadoJuego.textContent = "Primero inicia la partida.";
            return;
        }

        const jugadorActual = jugadores[turno];

        if (jugadoresPenalizados.has(jugadorActual.nombre)) {
            estadoJuego.textContent = `${jugadorActual.nombre} pierde su turno por penalización.`;
            jugadoresPenalizados.delete(jugadorActual.nombre);
            turno = (turno + 1) % jugadores.length;
            return;
        }

        const pasos = tirarDado();
        estadoJuego.textContent = `${jugadorActual.nombre} tira el dado y saca un ${pasos}.`;

        if (moverJugador(jugadorActual, pasos)) {
            turno = (turno + 1) % jugadores.length;
        } else if (juegoTerminado) {
            tirarDadoBtn.disabled = true;
        }
    });

    if (btnMostrarReglas && contenedorReglas) {
        contenedorReglas.style.display = "none";

        btnMostrarReglas.addEventListener("click", function() {
            if (contenedorReglas.style.display === "none") {
                contenedorReglas.style.display = "block";
                btnMostrarReglas.textContent = "Ocultar Reglas";
            } else {
                contenedorReglas.style.display = "none";
                btnMostrarReglas.textContent = "Mostrar Reglas";
            }
        });
    }
});

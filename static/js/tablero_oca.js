// static/js/tablero_oca.js
document.addEventListener("DOMContentLoaded", function() {
    const tablero = document.getElementById("tablero");
    const salidaDiv = document.getElementById("salida");
    const salidaFichasDiv = document.getElementById("salida-fichas");
    const tirarDadoBtn = document.getElementById("tirarDado");
    const estadoJuego = document.getElementById("estadoJuego");
    const turnoJugadorDiv = document.getElementById("turnoJugador");
    const numJugadoresInput = document.getElementById("numJugadores");
    const iniciarJuegoBtn = document.getElementById("iniciarJuego");
    const nombresJugadoresDiv = document.getElementById("nombresJugadores");
    const btnMostrarReglas = document.getElementById("mostrarReglas");
    const contenedorReglas = document.querySelector(".reglas");
    const dadoVisual = document.getElementById("dadoVisual");


    const winnerOverlay = document.getElementById("winnerOverlay");
    const winnerNameSpan = document.getElementById("winnerName");
    const closeWinnerBtn = document.getElementById("closeWinner");

    if (!tablero || !tirarDadoBtn || !estadoJuego || !numJugadoresInput || !iniciarJuegoBtn) {
        return;
    }

    // Total de casillas
    const NUM_CASILLAS = 55;

    // ================== SONIDOS ==================
    // Coloca estos archivos en: static/sounds/
    const soundDado         = new Audio("/static/sounds/dado.mp3");
    const soundPremio       = new Audio("/static/sounds/premio.mp3");
    const soundPenalizacion = new Audio("/static/sounds/penalizacion.mp3");
    const soundMuerte       = new Audio("/static/sounds/muerte.mp3");
    const soundVictoria     = new Audio("/static/sounds/victoria.mp3");
    [soundDado, soundPremio, soundPenalizacion, soundMuerte, soundVictoria].forEach(s => {
        s.volume = 0.6;
    });

    
    

    let jugadores = [];
    let turno = 0;
    let juegoTerminado = false;
    let jugadoresPenalizados = new Set();

// Limitar duración a 1 segundo
soundDado.addEventListener("timeupdate", () => {
    if (soundDado.currentTime > 1) {
        soundDado.pause();
        soundDado.currentTime = 0;
    }
});


    // ================== DADO VISUAL ==================
    function actualizarDadoVisual(valor) {
        if (!dadoVisual) return;

        // Mostrar solo el número
        dadoVisual.textContent = valor;
    }

    


    // ================== UI TURNO ==================
    function actualizarTurnoUI() {
        if (!jugadores.length || juegoTerminado) return;

        const jugadorActual = jugadores[turno];

        if (turnoJugadorDiv) {
            turnoJugadorDiv.textContent = `Turno: ${jugadorActual.nombre}`;
        }

        if (tirarDadoBtn && jugadorActual.ficha) {
            const colorFicha = jugadorActual.ficha.style.backgroundColor || "#ff6600";
            tirarDadoBtn.style.backgroundColor = colorFicha;
        }
    }

    tirarDadoBtn.disabled = true;

    // ================== OVERLAY GANADOR ==================
    function mostrarGanador(jugador) {
        if (winnerNameSpan) {
            winnerNameSpan.textContent = jugador.nombre;
        }
        if (winnerOverlay) {
            winnerOverlay.classList.add("visible");
        }
    }

    if (closeWinnerBtn && winnerOverlay) {
        closeWinnerBtn.addEventListener("click", () => {
            winnerOverlay.classList.remove("visible");
        });
    }

    // ================== CONFIGURAR JUGADORES ==================
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

    if (winnerOverlay) {
        winnerOverlay.classList.remove("visible");
    }

    // 🔹 AQUÍ: limpiar el dado visual al empezar
    if (dadoVisual) {
        dadoVisual.textContent = "";
    }

    // Limpiar fichas de salida
    if (salidaFichasDiv) {
        salidaFichasDiv.innerHTML = "";
    }

    // ... (resto de iniciarPartida)


        // 🔢 Generar 55 casillas
        for (let i = 1; i <= NUM_CASILLAS; i++) {
            const casilla = document.createElement("div");
            casilla.classList.add("casilla");

            const numero = document.createElement("span");
            numero.classList.add("numero");
            numero.textContent = i;
            casilla.appendChild(numero);

            // Casillas especiales:
            // ⚡ 4 y 22 — impulso (+2)
            // ⛓️ 12 y 46 — cárcel (pierde turno)
            // 🟩 18 ↔ 36 — trampolín ida/vuelta
            // ⬅️ 40 — retroceso 7
            // ⏪ 50 — gran retroceso (25)
            // 💀 34 — muerte (salida)
            if (i === 12 || i === 46) {
                casilla.classList.add("penalizacion", "carcel");
            } else if (i === 5 || i === 22) {
                casilla.classList.add("especial", "rayo");
            } else if (i === 18) {
                casilla.classList.add("trampolin");
            } else if (i === 36) {
                casilla.classList.add("trampolin-back");
            } else if (i === 40) {
                casilla.classList.add("retroceso");
            } else if (i === 50) {
                casilla.classList.add("retroceso-fuerte");
            } else if (i === 34) {
                casilla.classList.add("muerte");
            }

            // 🏁 Meta (casilla 55)
            if (i === NUM_CASILLAS) {
                casilla.classList.add("meta");
            }

            tablero.appendChild(casilla);
        }

        // Fichas en SALIDA
        jugadores.forEach((jugador, index) => {
            const ficha = document.createElement("div");
            ficha.classList.add("ficha");

            // Nombre (recortado si es muy largo) dentro de la ficha
            const nombreCorto = jugador.nombre.length > 8
                ? jugador.nombre.slice(0, 8) + "…"
                : jugador.nombre;

            ficha.textContent = nombreCorto;
            ficha.title = jugador.nombre;  // tooltip con el nombre completo

            ficha.style.backgroundColor = `hsl(${index * 60}, 70%, 50%)`;
            jugador.ficha = ficha;
            jugador.posicion = -1;

            if (salidaFichasDiv) {
                salidaFichasDiv.appendChild(ficha);
            }
        });


        tirarDadoBtn.disabled = false;
        estadoJuego.textContent = "Partida iniciada. Empieza " + jugadores[0].nombre;
        actualizarTurnoUI();
    }

    // ================== VICTORIA ==================
    function manejarVictoria(jugador) {
        const casillaFinal = NUM_CASILLAS - 1;

        estadoJuego.textContent = `${jugador.nombre} ha ganado el juego 🎉 (casilla 55)`;
        juegoTerminado = true;
        tirarDadoBtn.disabled = true;

        try {
            soundVictoria.currentTime = 0;
            soundVictoria.play();
        } catch (e) {}

        const casillaGanadora = tablero.children[casillaFinal];
        if (casillaGanadora) {
            casillaGanadora.appendChild(jugador.ficha);
        }

        mostrarGanador(jugador);
    }

    // ================== LÓGICA DE MOVIMIENTO ==================
    function moverJugador(jugador, pasos) {
        if (jugador.posicion >= 0) {
            const casillaActual = tablero.children[jugador.posicion];
            if (casillaActual && casillaActual.contains(jugador.ficha)) {
                casillaActual.removeChild(jugador.ficha);
            }
        } else {
            if (salidaFichasDiv && salidaFichasDiv.contains(jugador.ficha)) {
                salidaFichasDiv.removeChild(jugador.ficha);
            }
        }

        let nuevaPosicion = jugador.posicion + pasos;
        const casillaFinal = NUM_CASILLAS - 1;

        if (nuevaPosicion > casillaFinal) {
            let exceso = nuevaPosicion - casillaFinal;
            nuevaPosicion = casillaFinal - exceso;
            estadoJuego.textContent = `${jugador.nombre} saca un ${pasos} y rebota, retrocede a la casilla ${nuevaPosicion + 1}.`;
        }

        jugador.posicion = nuevaPosicion;
        let numeroCasilla = jugador.posicion + 1;

        // ¿Ha llegado directamente a meta?
        if (jugador.posicion === casillaFinal) {
            manejarVictoria(jugador);
            return false;
        }

        // ===== CASILLAS ESPECIALES =====

        // ⛓️ 12 y 46 — cárcel
        if (numeroCasilla === 12 || numeroCasilla === 46) {
            estadoJuego.textContent = `${jugador.nombre} cae en una casilla de penalización y pierde un turno. ☠️`;
            jugadoresPenalizados.add(jugador.nombre);
            try { soundPenalizacion.currentTime = 0; soundPenalizacion.play(); } catch (e) {}

        // ⚡ 4 y 22 — impulso (+2)
        } else if (numeroCasilla === 5 || numeroCasilla === 22) {
            jugador.posicion = Math.min(jugador.posicion + 2, casillaFinal);
            numeroCasilla = jugador.posicion + 1;
            estadoJuego.textContent = `${jugador.nombre} recibe un impulso y avanza 2 casillas ✨ (ahora está en la ${numeroCasilla}).`;
            try { soundPremio.currentTime = 0; soundPremio.play(); } catch (e) {}

        // ⬅️ 40 — retroceso 7
        } else if (numeroCasilla === 40) {
            jugador.posicion = Math.max(jugador.posicion - 7, 0);
            numeroCasilla = jugador.posicion + 1;
            estadoJuego.textContent = `${jugador.nombre} cae en la casilla 40 y retrocede 7 casillas hasta la ${numeroCasilla}. ⬅️`;
            try { soundPenalizacion.currentTime = 0; soundPenalizacion.play(); } catch (e) {}

        // 🟩 18 — trampolín a 36
        } else if (numeroCasilla === 18) {
            jugador.posicion = 35; // casilla 36
            numeroCasilla = 36;
            estadoJuego.textContent = `${jugador.nombre} cae en el trampolín de la casilla 18 y salta a la 36 🚀`;
            try { soundPremio.currentTime = 0; soundPremio.play(); } catch (e) {}

        // 🔁 36 — rebote a 18
        } else if (numeroCasilla === 36) {
            jugador.posicion = 17; // casilla 18
            numeroCasilla = 18;
            estadoJuego.textContent = `${jugador.nombre} cae en la casilla 36 y rebota de vuelta a la 18 🔁`;
            try { soundPremio.currentTime = 0; soundPenalizacion.play(); } catch (e) {}

        // ⏪ 50 — gran retroceso
        } else if (numeroCasilla === 50) {
            jugador.posicion = 24; // casilla 25
            numeroCasilla = 25;
            estadoJuego.textContent = `${jugador.nombre} sufre un gran retroceso y va a la casilla 25 ❗`;
            try { soundPenalizacion.currentTime = 0; soundPenalizacion.play(); } catch (e) {}

        // 💀 34 — muerte
        } else if (numeroCasilla === 34) {
            jugador.posicion = -1;
            numeroCasilla = 0;
            estadoJuego.textContent = `${jugador.nombre} cae en la casilla de muerte (34) 💀 y vuelve a la SALIDA.`;
            try { soundMuerte.currentTime = 0; soundMuerte.play(); } catch (e) {}
        }

        // ¿Ha llegado a meta después de casilla especial?
        if (jugador.posicion === casillaFinal) {
            manejarVictoria(jugador);
            return false;
        }

        // Colocar ficha en su nueva posición
        if (jugador.posicion === -1) {
            if (salidaFichasDiv) {
                salidaFichasDiv.appendChild(jugador.ficha);
            }
        } else {
            const nuevaCasilla = tablero.children[jugador.posicion];
            if (nuevaCasilla) {
                nuevaCasilla.appendChild(jugador.ficha);
            }
        }

        return true;
    }

    // ================== DADO ==================
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

        // Sonido de tirar dado
        try { soundDado.currentTime = 0; soundDado.play(); } catch (e) {}

        if (jugadoresPenalizados.has(jugadorActual.nombre)) {
            estadoJuego.textContent = `${jugadorActual.nombre} pierde su turno por penalización.`;
            jugadoresPenalizados.delete(jugadorActual.nombre);
            turno = (turno + 1) % jugadores.length;
            actualizarTurnoUI();
            return;
        }

        const pasos = tirarDado();

        // 🔹 Actualizar dado visual
        actualizarDadoVisual(pasos);

        estadoJuego.textContent = `${jugadorActual.nombre} tira el dado y saca un ${pasos}.`;


        if (moverJugador(jugadorActual, pasos)) {
            turno = (turno + 1) % jugadores.length;
            actualizarTurnoUI();
        } else if (juegoTerminado) {
            tirarDadoBtn.disabled = true;
        }
    });

    // ================== MOSTRAR / OCULTAR REGLAS ==================
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

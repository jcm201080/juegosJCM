// static/js/tablero_oca_online.js
document.addEventListener("DOMContentLoaded", function () {
  const tablero = document.getElementById("tablero");
  const salidaFichasDiv = document.getElementById("salida-fichas");
  const tirarDadoBtn = document.getElementById("tirarDado");
  const estadoJuego = document.getElementById("estadoJuego");
  const turnoJugadorDiv = document.getElementById("turnoJugador");
  const dadoVisual = document.getElementById("dadoVisual");

  const btnCrear = document.getElementById("btnCrear");
  const btnUnir = document.getElementById("btnUnir");
  const onlineName = document.getElementById("onlineName");
  const onlineCode = document.getElementById("onlineCode");
  const codeLabel = document.getElementById("codeLabel");
  const playerLabel = document.getElementById("playerLabel");

  const btnMostrarReglas = document.getElementById("mostrarReglas");
  const contenedorReglas = document.querySelector(".reglas");

  const winnerOverlay = document.getElementById("winnerOverlay");
  const winnerNameSpan = document.getElementById("winnerName");
  const closeWinnerBtn = document.getElementById("closeWinner");

  if (!tablero || !tirarDadoBtn || !estadoJuego) return;

  const NUM_CASILLAS = 55;
  const API = "/api/oca"; // base API

  // ===== Sonidos (igual que local) =====
  const soundDado = new Audio("/static/sounds/dado.mp3");
  const soundPremio = new Audio("/static/sounds/premio.mp3");
  const soundPenalizacion = new Audio("/static/sounds/penalizacion.mp3");
  const soundMuerte = new Audio("/static/sounds/muerte.mp3");
  const soundVictoria = new Audio("/static/sounds/victoria.mp3");
  [soundDado, soundPremio, soundPenalizacion, soundMuerte, soundVictoria].forEach(
    (s) => (s.volume = 0.6)
  );

  soundDado.addEventListener("timeupdate", () => {
    if (soundDado.currentTime > 1) {
      soundDado.pause();
      soundDado.currentTime = 0;
    }
  });

  function actualizarDadoVisual(valor) {
    if (!dadoVisual) return;
    dadoVisual.textContent = valor ?? "";
  }

  function mostrarGanador(nombre) {
    if (winnerNameSpan) winnerNameSpan.textContent = nombre;
    if (winnerOverlay) winnerOverlay.classList.add("visible");
  }

  // ✅ FIX: bandera para NO re-disparar overlay + audio en cada polling
  let winnerShown = false;

  // ✅ FIX: al cerrar, también paramos la victoria
  if (closeWinnerBtn && winnerOverlay) {
    closeWinnerBtn.addEventListener("click", () => {
      winnerOverlay.classList.remove("visible");
      try {
        soundVictoria.pause();
        soundVictoria.currentTime = 0;
      } catch (e) {}
      // OJO: no ponemos winnerShown=false aquí a propósito,
      // porque si no el polling lo volvería a abrir al segundo siguiente.
    });
  }

  // ✅ Cerrar overlay haciendo click fuera de la tarjeta
winnerOverlay?.addEventListener("click", (e) => {
  if (e.target === winnerOverlay) {
    winnerOverlay.classList.remove("visible");
    try {
      soundVictoria.pause();
      soundVictoria.currentTime = 0;
    } catch (e2) {}
  }
});

// ✅ Cerrar overlay con la tecla ESC
document.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    winnerOverlay?.classList.contains("visible")
  ) {
    winnerOverlay.classList.remove("visible");
    try {
      soundVictoria.pause();
      soundVictoria.currentTime = 0;
    } catch (e2) {}
  }
});

  // ===== Estado local mínimo (identidad) =====
  let gameCode = localStorage.getItem("oca_code") || "";
  let playerId = localStorage.getItem("oca_player_id") || "";

  // ===== Render tablero fijo =====
  function renderTableroBase() {
    tablero.innerHTML = "";
    for (let i = 1; i <= NUM_CASILLAS; i++) {
      const casilla = document.createElement("div");
      casilla.classList.add("casilla");

      const numero = document.createElement("span");
      numero.classList.add("numero");
      numero.textContent = i;
      casilla.appendChild(numero);

      if (i === 12 || i === 46) casilla.classList.add("penalizacion", "carcel");
      else if (i === 5 || i === 22) casilla.classList.add("especial", "rayo");
      else if (i === 18) casilla.classList.add("trampolin");
      else if (i === 36) casilla.classList.add("trampolin-back");
      else if (i === 40) casilla.classList.add("retroceso");
      else if (i === 50) casilla.classList.add("retroceso-fuerte");
      else if (i === 34) casilla.classList.add("muerte");

      if (i === NUM_CASILLAS) casilla.classList.add("meta");

      tablero.appendChild(casilla);
    }
  }

  renderTableroBase();

  // ===== Pintar estado (players, turno, mensajes) =====
  function pintarEstado(state) {
    if (!state) return;

    // labels
    if (codeLabel) codeLabel.textContent = state.code || gameCode || "—";
    if (playerLabel) playerLabel.textContent = playerId || "—";

    // mensaje
    if (estadoJuego) estadoJuego.textContent = state.message || "";

    // dado visual
    actualizarDadoVisual(state.last_roll ?? "");

    // turno UI
    if (turnoJugadorDiv && state.players?.length) {
      const p = state.players[state.turn_index];
      turnoJugadorDiv.textContent = p ? `Turno: ${p.name}` : "Turno: —";
    }

    // habilitar botón tirar solo si es mi turno y no terminó
    const myTurn = state.players?.[state.turn_index]?.id === playerId;
    tirarDadoBtn.disabled = !myTurn || state.finished;

    // limpiar fichas de salida y casillas (solo fichas)
    if (salidaFichasDiv) salidaFichasDiv.innerHTML = "";

    // quitar fichas de todas las casillas sin borrar el número
    Array.from(tablero.children).forEach((cas) => {
      Array.from(cas.querySelectorAll(".ficha")).forEach((f) => f.remove());
    });

    // crear/colocar fichas según players
    state.players.forEach((pl, idx) => {
      const ficha = document.createElement("div");
      ficha.classList.add("ficha");

      const nombreCorto = pl.name.length > 8 ? pl.name.slice(0, 8) + "…" : pl.name;
      ficha.textContent = nombreCorto;
      ficha.title = pl.name;

      ficha.style.backgroundColor = pl.color || `hsl(${idx * 60}, 70%, 50%)`;

      if (pl.pos === -1) {
        salidaFichasDiv?.appendChild(ficha);
      } else {
        const cas = tablero.children[pl.pos];
        if (cas) cas.appendChild(ficha);
      }
    });

    // ✅ FIX: overlay ganador SOLO UNA VEZ (si polling, no lo reabre ni reinicia audio)
    if (state.finished && state.winner_name) {
      if (!winnerShown) {
        winnerShown = true;

        try {
          soundVictoria.currentTime = 0;
          soundVictoria.play();
        } catch (e) {
          // autoplay policies
        }

        mostrarGanador(state.winner_name);
      }
    } else {
      // si el server vuelve a estado "no final", permitimos que vuelva a mostrarse en el futuro
      winnerShown = false;
      winnerOverlay?.classList.remove("visible");
      try {
        soundVictoria.pause();
        soundVictoria.currentTime = 0;
      } catch (e) {}
    }
  }

  // ===== API helpers =====
  async function postJSON(url, data) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data || {}),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || "Error de servidor");
    return payload;
  }

  async function getJSON(url) {
    const res = await fetch(url);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || "Error de servidor");
    return payload;
  }

  // ===== Crear / Unir =====
  btnCrear?.addEventListener("click", async () => {
    const name = (onlineName?.value || "").trim() || "Jugador";
    try {
      const data = await postJSON(`${API}/create`, { name });
      gameCode = data.code;
      playerId = data.player_id;
      localStorage.setItem("oca_code", gameCode);
      localStorage.setItem("oca_player_id", playerId);

      // ✅ al crear una partida nueva, reseteamos bandera ganador
      winnerShown = false;
      try {
        soundVictoria.pause();
        soundVictoria.currentTime = 0;
      } catch (e) {}

      pintarEstado(data.state);
    } catch (e) {
      alert(e.message);
    }
  });

  btnUnir?.addEventListener("click", async () => {
    const name = (onlineName?.value || "").trim() || "Jugador";
    const code = (onlineCode?.value || "").trim().toUpperCase();
    if (!code) return alert("Mete un código de partida");
    try {
      const data = await postJSON(`${API}/join`, { code, name });
      gameCode = data.code;
      playerId = data.player_id;
      localStorage.setItem("oca_code", gameCode);
      localStorage.setItem("oca_player_id", playerId);

      // ✅ al unirse, dejamos que el server mande finished,
      // pero evitamos bucles por polling (se mostrará 1 vez)
      winnerShown = false;
      try {
        soundVictoria.pause();
        soundVictoria.currentTime = 0;
      } catch (e) {}

      pintarEstado(data.state);
    } catch (e) {
      alert(e.message);
    }
  });

  // ===== Tirar dado (online) =====
  tirarDadoBtn.addEventListener("click", async () => {
    if (!gameCode || !playerId) return alert("Crea o únete a una partida primero.");

    try {
      soundDado.currentTime = 0;
      soundDado.play();
    } catch (e) {}

    try {
      const data = await postJSON(`${API}/roll`, { code: gameCode, player_id: playerId });

      if (data.event === "premio") {
        try {
          soundPremio.currentTime = 0;
          soundPremio.play();
        } catch (e) {}
      }
      if (data.event === "penalizacion") {
        try {
          soundPenalizacion.currentTime = 0;
          soundPenalizacion.play();
        } catch (e) {}
      }
      if (data.event === "muerte") {
        try {
          soundMuerte.currentTime = 0;
          soundMuerte.play();
        } catch (e) {}
      }

      pintarEstado(data.state);
    } catch (e) {
      alert(e.message);
    }
  });

  // ===== Polling estado =====
  async function refrescar() {
    if (!gameCode) return;
    try {
      const data = await getJSON(`${API}/state/${gameCode}`);
      pintarEstado(data.state);
    } catch (e) {
      // silencio
    }
  }
  setInterval(refrescar, 1500);

  // carga inicial si hay code guardado
  if (gameCode) refrescar();

  // ===== Reglas show/hide =====
  if (btnMostrarReglas && contenedorReglas) {
    contenedorReglas.style.display = "none";
    btnMostrarReglas.addEventListener("click", function () {
      const hidden = contenedorReglas.style.display === "none";
      contenedorReglas.style.display = hidden ? "block" : "none";
      btnMostrarReglas.textContent = hidden ? "Ocultar Reglas" : "Mostrar Reglas";
    });
  }
});

/* global io */

import { renderCarton, setBolasCantadas } from "./cartones.js";
import { initAutoPlayClassic } from "./autoplay_classic.js";

console.log("🔥 sala.js CARGADO");
window.__SALA_JS_OK__ = true;

const socket = io("/bingo-classic");

// =======================
// Nombre del jugador (preparado para login)
// =======================
const playerName = window.BINGO_USER || "Invitado";

// =======================
// 🧮 PUNTUACIÓN
// =======================
let puntos = 0;

function actualizarPuntuacion() {
    const cont = document.getElementById("puntuacion");
    if (!cont) return;
    cont.textContent = `⭐ Puntos: ${puntos}`;
}

// =======================
// Sonido bolas
// =======================
const ballSound = new Audio("/static/sounds/bingo_ball.mp3");
ballSound.volume = 0.4; // suave, no molesto

// Intentar desbloquear audio al interactuar
let audioUnlocked = false;

function unlockAudio() {
    if (audioUnlocked) return;
    ballSound
        .play()
        .then(() => {
            ballSound.pause();
            ballSound.currentTime = 0;
            audioUnlocked = true;
        })
        .catch(() => {});
}

document.addEventListener("click", unlockAudio, { once: true });

// =======================
// Cartón recibido
// =======================
function renderCartones(cartones) {
    const container = document.getElementById("carton-container");
    if (!container) return;

    container.innerHTML = ""; // limpiar cartones anteriores

    cartones.forEach((carton, index) => {
        const wrapper = document.createElement("div");
        wrapper.className = "carton-wrapper";

        const title = document.createElement("h4");
        title.textContent = `Cartón ${index + 1}`;

        const cartonDiv = document.createElement("div");
        cartonDiv.className = "carton";

        wrapper.appendChild(title);
        wrapper.appendChild(cartonDiv);
        container.appendChild(wrapper);

        // 👇 reutilizamos TU función existente
        renderCarton(carton, cartonDiv);
    });
}

//========================
//vidas
//========================
function renderVidas(vidas) {
    const cont = document.getElementById("vidas-container");
    if (!cont) return;

    cont.innerHTML = "";

    if (vidas <= 0) {
        cont.innerHTML = `<span class="dead">💀 Sin vidas</span>`;
        return;
    }

    for (let i = 0; i < vidas; i++) {
        const span = document.createElement("span");
        span.className = "heart";
        span.textContent = "❤️";
        cont.appendChild(span);
    }
}

// =======================
// 🔊 Sonidos arcade (Web Audio API)
// =======================
let audioCtx;

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

// 🎯 Sonido LÍNEA (beep corto)
function playLineaSound() {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square"; // 👈 arcade total
    osc.frequency.value = 880; // tono agudo

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
}

// 🏆 Sonido BINGO (fanfarria arcade)
function playBingoSound() {
    const ctx = getAudioCtx();

    const notas = [523, 659, 784, 1046]; // do-mi-sol-do 🎶
    let t = ctx.currentTime;

    notas.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "square";
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.25);

        t += 0.18;
    });
}
// =======================
// 🎱 BOLAS ACTUALES (últimas 4)
// =======================
const bolasActuales = [];

function mostrarBolasActuales(bola) {
    const contenedor = document.querySelector(".bola-actual-lista");
    if (!contenedor) return;

    bolasActuales.push(bola);
    if (bolasActuales.length > 4) bolasActuales.shift();


    contenedor.innerHTML = "";

    bolasActuales.forEach((n, i) => {
        const div = document.createElement("div");
        div.className =
            "bola-actual-num" +
            (i === bolasActuales.length - 1 ? " latest" : "");
        div.textContent = n;
        contenedor.appendChild(div);
    });

}


// =======================
// Datos de la sala
// =======================
const codigo = window.CODIGO;

//Eventos y lógica de la sala de bingo:CANTAR bingo y linea y cruz

const btnLinea = document.getElementById("btnLinea");
const btnBingo = document.getElementById("btnBingo");
const btnCruz = document.getElementById("btnCruz");
const btnX = document.getElementById("btnX");

if (btnCruz) {
    btnCruz.addEventListener("click", () => {
        socket.emit("cantar_cruz", {
            codigo,
            nombre: playerName,
        });
    });
}

if (btnLinea) {
    btnLinea.addEventListener("click", () => {
        socket.emit("cantar_linea", {
            codigo,
            nombre: playerName,
        });
    });
}

if (btnX) {
    btnX.addEventListener("click", () => {
        socket.emit("cantar_x", {
            codigo,
            nombre: playerName,
        });
    });
}

if (btnBingo) {
    btnBingo.addEventListener("click", () => {
        socket.emit("cantar_bingo", {
            codigo,
            nombre: playerName,
        });
    });
}

// =======================
// Conexión
// =======================
socket.on("connect", () => {
    const numCartones = parseInt(document.getElementById("numCartones")?.value || 1);

    socket.emit("join_bingo", {
        codigo,
        cartones: numCartones,
        nombre: playerName,
    });
});

socket.on("disconnect", () => {
    console.log("❌ Socket desconectado");
});

// =======================
// Botón sacar bola (manual)
// =======================
const newBallBtn = document.getElementById("newBallBtn");

if (newBallBtn) {
    newBallBtn.addEventListener("click", () => {
        unlockAudio();
        socket.emit("new_ball", { codigo });
    });
}




// =======================
// Botón iniciar partida
// =======================
const startGameBtn = document.getElementById("startGameBtn");

if (startGameBtn) {
    startGameBtn.addEventListener("click", () => {
        unlockAudio();
        const numCartones = parseInt(document.getElementById("numCartones")?.value || 1);

        socket.emit("start_game", {
            codigo,
            cartones: numCartones,
        });

        startGameBtn.style.display = "none";
    });
}

// =======================
// Estado jugadores
// =======================
socket.on("lista_jugadores", (data) => {
    console.log("📦 lista_jugadores recibido:", data);

    const cartonesSelect = document.getElementById("cartones-select");

    const controlesHost = document.getElementById("controles-host");

    const estadoEspera = document.getElementById("estado-espera");
    const estado = document.getElementById("estado");

    const autoBtn = document.getElementById("autoPlayBtn");
    const pauseBtn = document.getElementById("pauseAutoBtn");
    const countdown = document.getElementById("autoCountdown");

    const btnLinea = document.getElementById("btnLinea");
    const btnBingo = document.getElementById("btnBingo");
    const btnCruz = document.getElementById("btnCruz");

    const intervalSelect = document.getElementById("intervalSelect");
    const validaciones = document.querySelector(".bingo-validaciones");

    // ───────── ESTADO DE ESPERA ─────────
    if (data.en_partida) {
        estadoEspera?.remove();
    } else if (estado) {
        estado.innerHTML = `
            <p>
                Esperando jugadores…
                <strong>(${data.actuales}/${data.max})</strong>
                <br>
                <small>Mínimo para empezar: ${data.min}</small>
            </p>
        `;
    }

    // ───────── BOTONES LÍNEA / BINGO ─────────
    if (data.en_partida) {
        validaciones.style.display = "flex";
    } else {
        validaciones.style.display = "none";
    }

    // ───────── INICIAR PARTIDA (solo host) ─────────
    if (data.host && data.actuales >= data.min && !data.en_partida) {
        startGameBtn.style.display = "inline-block";
    } else if (startGameBtn) {
        startGameBtn.style.display = "none";
    }

    // ───────── SACAR BOLA (solo host y partida iniciada) ─────────
    if (data.host && data.en_partida && newBallBtn) {
        newBallBtn.style.display = "inline-block";
        newBallBtn.disabled = false;
    } else if (newBallBtn) {
        newBallBtn.style.display = "none";
    }

    // ───────── AUTOPLAY (solo host) ─────────
    if (data.host && data.en_partida) {
        if (!window.__autoplayInit) {
            initAutoPlayClassic({ socket, codigo });
            window.__autoplayInit = true;
        }

        autoBtn && (autoBtn.style.display = "inline-block");
        intervalSelect && (intervalSelect.style.display = "inline-block");
    } else {
        autoBtn && (autoBtn.style.display = "none");
        pauseBtn && (pauseBtn.style.display = "none");
        intervalSelect && (intervalSelect.style.display = "none");
        countdown && (countdown.style.display = "none");
    }

    // 🎯 Línea
    if (!data.en_partida || data.linea_cantada) {
        btnLinea.disabled = true;
        btnLinea.classList.add("disabled");
    } else {
        btnLinea.disabled = false;
        btnLinea.classList.remove("disabled");
    }

    // ❌ Cruz
    if (!data.en_partida || data.cruz_cantada) {
        btnCruz.disabled = true;
        btnCruz.classList.add("disabled");
    } else {
        btnCruz.disabled = false;
        btnCruz.classList.remove("disabled");
    }

    // ❌ X
    if (!data.en_partida || data.x_cantada) {
        btnX.disabled = true;
        btnX.classList.add("disabled");
    } else {
        btnX.disabled = false;
        btnX.classList.remove("disabled");
    }

    // 🏆 Bingo
    if (!data.en_partida || data.bingo_cantado) {
        btnBingo.disabled = true;
        btnBingo.classList.add("disabled");
    } else {
        btnBingo.disabled = false;
        btnBingo.classList.remove("disabled");
    }

    if (data.host && !data.en_partida) {
        cartonesSelect && (cartonesSelect.style.display = "block");
    } else {
        cartonesSelect && (cartonesSelect.style.display = "none");
    }
    if (!data.host && controlesHost) {
        controlesHost.style.display = "none";
    } else if (data.host && controlesHost) {
        controlesHost.style.display = "block";
    }
});

// =======================
// Partida iniciada
// =======================
socket.on("game_started", () => {
    puntos = 0;
    actualizarPuntuacion();

    bolasActuales.length = 0;
    const cont = document.querySelector(".bola-actual-lista");
    cont && (cont.innerHTML = "");
});


// =======================
// Cartón recibido
// =======================
socket.on("send_carton", (data) => {
    console.log("🎟️ Cartones recibidos:", data.cartones);
    renderCartones(data.cartones);
    renderVidas(3);
});

// =======================
// Bola cantada
// =======================
socket.on("bola_cantada", (data) => {
    // sonido bola
    ballSound.currentTime = 0;
    ballSound.play().catch(() => {});

    // actualizar UI
    setBolasCantadas(data.historial);
    mostrarBolasActuales(data.bola);
    renderHistorial(data.historial);
});

// =======================
// Historial de bolas
// =======================
function renderHistorial(bolas) {
    const contenedor = document.querySelector(".historial-bolas");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    if (!bolas || bolas.length === 0) return;

    // ⚠️ última bola real (la que acaba de salir)
    const ultimaBola = bolas[bolas.length - 1];

    // 🔢 copia ordenada de menor a mayor
    const bolasOrdenadas = [...bolas].sort((a, b) => a - b);

    bolasOrdenadas.forEach((bola) => {
        const span = document.createElement("span");
        span.classList.add("bola-historial");

        // ⭐ marcar la última bola cantada
        if (bola === ultimaBola) {
            span.classList.add("ultima");
        }

        span.textContent = bola;
        contenedor.appendChild(span);
    });
}



// =======================
// Toast de notificaciones
// =======================

function showToast(message, type = "error", duration = 2500) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hidden");
    }, duration);
}

// =======================
// Salir de la sala
// =======================
const resetBtn = document.getElementById("resetBtn");

if (resetBtn) {
    resetBtn.addEventListener("click", () => {
        socket.emit("leave_bingo", { codigo });
    });
}

socket.on("salida_ok", () => {
    window.location.href = "/bingo/classic";
});

socket.on("sala_cerrada", () => {
    alert("El host ha cerrado la sala");
    window.location.href = "/bingo/classic";
});

// =======================
// AVISO CENTRAL (LÍNEA / BINGO)
// =======================
function mostrarAvisoCantar(texto, tipo = "linea") {
    const aviso = document.getElementById("aviso-cantar");
    if (!aviso) return;

    aviso.textContent = texto;
    aviso.className = `aviso-cantar ${tipo}`;

    // ⏱ tiempos distintos
    const duracion = tipo === "bingo" ? 8000 : tipo === "cruz" ? 5000 : 3000;

    setTimeout(() => {
        aviso.classList.add("hidden");
    }, duracion);
}

// =======================
// FEEDBACK LINEA / BINGO / CRUZ
// =======================
socket.on("linea_valida", (data) => {
    const jugador = data?.nombre || "un jugador";

    playLineaSound();
    mostrarAvisoCantar(`🎯 LÍNEA de ${jugador}`, "linea");
    showToast(`🎯 Línea válida (${jugador})`);

    if (jugador === playerName) {
        puntos += 1;
        actualizarPuntuacion();
    }
});

socket.on("cruz_valida", (data) => {
    const jugador = data?.nombre || "un jugador";

    playLineaSound();
    mostrarAvisoCantar(`➕ CRUZ de ${jugador}`, "cruz");
    showToast(`➕ Cruz válida (${jugador})`);

    if (jugador === playerName) {
        puntos += 2;
        actualizarPuntuacion();
    }
});

socket.on("x_valida", (data) => {
    const jugador = data?.nombre || "un jugador";

    playLineaSound();
    mostrarAvisoCantar(`❌ X de ${jugador}`, "cruz");
    showToast(`❌ X válida (${jugador})`);

    // 🔒 BLOQUEO DEFINITIVO
    const btnX = document.getElementById("btnX");
    if (btnX) {
        btnX.disabled = true;
        btnX.classList.add("disabled");
    }

    if (jugador === playerName) {
        puntos += 2;
        actualizarPuntuacion();
    }
});


socket.on("cruz_invalida", () => {
    showToast("❌ Cruz incorrecta");
});

socket.on("x_invalida", () => {
    showToast("❌ X incorrecta");
});

socket.on("bingo_valido", (data) => {
    const jugador = data?.nombre || "un jugador";

    playBingoSound();
    mostrarAvisoCantar(`🏆 BINGO de ${jugador}`, "bingo");
    showToast(`🏆 Bingo válido (${jugador})`);

    if (jugador === playerName) {
        puntos += 5;
        actualizarPuntuacion();
    }
});

socket.on("linea_invalida", () => {
    showToast("❌ Línea incorrecta");
});

socket.on("bingo_invalido", () => {
    showToast("❌ Bingo incorrecto");
});

// =======================
// ❤️ VIDAS (Socket.IO)
// =======================
socket.on("vidas_actualizadas", (data) => {
    renderVidas(data.vidas);
    showToast(`❤️ Vidas restantes: ${data.vidas}`, "warning");
});

socket.on("sin_vidas", () => {
    renderVidas(0);
    showToast("☠️ Te has quedado sin vidas", "error");

    const botones = [
        "btnLinea",
        "btnCruz",
        "btnX",
        "btnBingo"
    ];

    botones.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = true;
            btn.classList.add("disabled");
        }
    });
});

// =======================
// 🏆 RANKING (desde backend)
// =======================
socket.on("ranking_update", (data) => {
    const rankingList = document.getElementById("ranking-list");
    if (!rankingList) return;

    rankingList.innerHTML = "";

    data.ranking.forEach((j, index) => {
        const li = document.createElement("li");

        li.innerHTML = `
            <span>${index + 1}. ${j.nombre}</span>
            <span class="puntos">${j.puntos} pts</span>
        `;

        // resaltar al jugador actual
        if (j.nombre === playerName) {
            li.classList.add("me");
        }

        rankingList.appendChild(li);
    });
});

/* global io */

import { renderCarton, setBolasCantadas } from "./cartones.js";

console.log("🌐 online_sala.js CARGADO");
window.__ONLINE_SALA_JS_OK__ = true;

const socket = io();

// =======================
// Datos básicos
// =======================
const codigo = window.CODIGO;
const playerName = window.BINGO_USER || "Invitado";

// =======================
// Sonido bolas
// =======================
const ballSound = new Audio("/static/sounds/bingo_ball.mp3");
ballSound.volume = 0.4;

let audioUnlocked = false;

function unlockAudio() {
    if (audioUnlocked) return;
    ballSound.play()
        .then(() => {
            ballSound.pause();
            ballSound.currentTime = 0;
            audioUnlocked = true;
        })
        .catch(() => {});
}

document.addEventListener("click", unlockAudio, { once: true });


// vidas
let vidasActuales = 3;

function mostrarMensaje(texto, tipo = "info") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = texto;
    toast.className = `toast show ${tipo}`;

    setTimeout(() => {
        toast.className = "toast hidden";
    }, 3000);
}

function actualizarVidas(vidas) {
    vidasActuales = vidas;
    renderVidas(vidasActuales);

    if (vidasActuales <= 0) {
        mostrarMensaje("💀 Te has quedado sin vidas", "error");
        desactivarTodosLosBotones();
    }
}

function desactivarTodosLosBotones() {
    ["Linea", "Cruz", "X", "Bingo"].forEach((t) => {
        const btn = document.getElementById(`btn${t}`);
        if (btn) {
            btn.disabled = true;
            btn.classList.add("disabled");
        }
    });
}


function desactivarBoton(tipo) {
    const btn = document.getElementById(
        `btn${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`
    );
    if (!btn) return;

    btn.disabled = true;
    btn.classList.add("disabled");
    botonesCantados[tipo] = true;
}



const botonesCantados = {
    linea: false,
    cruz: false,
    bingo: false,
    x: false
};


//Ultimas tres bolas
function renderUltimasBolas(bolas) {
    const cont = document.getElementById("ultimas-bolas");
    if (!cont || bolas.length === 0) return;

    cont.innerHTML = "";

    const ultimas = bolas.slice(-3);

    ultimas.forEach((bola, index) => {
        const div = document.createElement("div");
        div.textContent = bola;

        if (index === ultimas.length - 1) {
            div.className = "ultima-bola";
        } else {
            div.className = "bola-anterior";
        }

        cont.appendChild(div);
    });
}


// =======================
// Render cartones
// =======================
function renderCartones(cartones) {
    const container = document.getElementById("carton-container");
    if (!container) return;

    container.innerHTML = "";

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

        renderCarton(carton, cartonDiv);
    });
}

// =======================
// Vidas
// =======================
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
// Conexión ONLINE
// =======================
socket.on("connect", () => {
    console.log("🔌 Conectado a sala online:", codigo);

    socket.emit("join_online_game", {
        codigo,
        nombre: playerName
    });
});

// =======================
// Estado sala (solo log)
// =======================
socket.on("lista_jugadores", (data) => {
    const cont = document.getElementById("lista-jugadores");
    if (!cont) return;

    cont.innerHTML = "";
    data.jugadores.forEach(nombre => {
        const li = document.createElement("li");
        li.textContent = nombre;
        cont.appendChild(li);
    });
});


// =======================
// Cartones recibidos
// =======================
socket.on("send_carton", (data) => {
    console.log("🎟️ Cartones online:", data.cartones);
    renderCartones(data.cartones);
    renderVidas(3);
});

// =======================
// Bola cantada
// =======================
socket.on("bola_cantada", (data) => {
    ballSound.currentTime = 0;
    ballSound.play().catch(() => {});

    setBolasCantadas(data.historial);
    mostrarBola(data.bola);
    renderHistorial(data.historial);
    renderUltimasBolas(data.historial);
});

//Iniciar Partida
socket.on("game_started", () => {
    console.log("🚀 Partida online iniciada");
    const estado = document.getElementById("estado-partida");
    if (estado) {
        estado.textContent = "🎉 Partida en curso";
    }
});


// cantar linea / cruz / x / bingo
socket.on("resultado_cantar", (data) => {
    const { tipo, valida, vidas, jugador, puntos } = data;

    if (valida) {
        if (tipo === "bingo") {
            mostrarMensaje(
                `🏆 BINGO cantado por ${jugador} (+5 pts)`,
                "ok"
            );
            desactivarTodosLosBotones();
        } else {
            const puntosTexto =
                tipo === "linea" ? "+1 pt" :
                tipo === "cruz" || tipo === "x" ? "+2 pts" :
                "";

            mostrarMensaje(
                `✅ ${tipo.toUpperCase()} cantado por ${jugador} (${puntosTexto})`,
                "ok"
            );

            desactivarBoton(tipo);
        }
    } else {
        mostrarMensaje(
            `❌ ${tipo.toUpperCase()} incorrecto`,
            "error"
        );

        if (typeof vidas === "number") {
            actualizarVidas(vidas);
        }
    }
});


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

        rankingList.appendChild(li);
    });
});






//Salir de la sala (frontend)
const salirBtn = document.getElementById("resetBtn");
if (salirBtn) {
    salirBtn.addEventListener("click", () => {
        socket.emit("salir_sala", {
            codigo: window.CODIGO
        });
        window.location.href = "/bingo/online";
    });
}





// =======================
// Historial bolas
// =======================
function renderHistorial(bolas) {
    const contenedor = document.querySelector(".historial-bolas");
    if (!contenedor || !bolas?.length) return;

    contenedor.innerHTML = "";

    const ultima = bolas[bolas.length - 1];
    const ordenadas = [...bolas].sort((a, b) => a - b);

    ordenadas.forEach((bola) => {
        const span = document.createElement("span");
        span.classList.add("bola-historial");
        if (bola === ultima) span.classList.add("ultima");
        span.textContent = bola;
        contenedor.appendChild(span);
    });
}

// =======================
// Última bola
// =======================
function mostrarBola(bola) {
    const ultimaBola = document.getElementById("ultima-bola");
    if (!ultimaBola) return;

    ultimaBola.innerHTML = `
        <span class="bola-label">🎱 Bola actual</span>
        <span class="bola-actual-num">${bola}</span>
    `;

    ultimaBola.classList.remove("flash");
    void ultimaBola.offsetWidth;
    ultimaBola.classList.add("flash");
}

// =======================
// Cantar línea / cruz / bingo
// =======================
["linea", "cruz","x", "bingo"].forEach((tipo) => {
    const btn = document.getElementById(
        `btn${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`
    );
    if (!btn) return;

    btn.addEventListener("click", () => {
        socket.emit(`cantar_${tipo}`, { codigo });
    });
});

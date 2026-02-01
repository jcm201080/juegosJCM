/* global io */

console.log("🌐 online_lobby.js cargado");

const socket = io();

// Elementos UI
const startBtn = document.getElementById("startOnlineBtn");
const playersList = document.getElementById("playersList");
const statusBox = document.getElementById("online-status");
const numPlayersSelect = document.getElementById("numPlayers");
const numCartonesSelect = document.getElementById("numCartones");


let countdownInterval = null;

// =======================
// Click: Buscar partida
// =======================
if (startBtn) {
    startBtn.addEventListener("click", () => {
        const maxPlayers = parseInt(numPlayersSelect.value, 10);
        const numCartones = parseInt(numCartonesSelect.value, 10);

        startBtn.disabled = true;
        startBtn.textContent = "⏳ Buscando jugadores...";

        socket.emit("join_online_lobby", {
            nombre: window.BINGO_USER || "Invitado",
            max_players: maxPlayers,
            cartones: numCartones
        });
    });

}

// =======================
// Actualización lobby
// =======================
socket.on("online_lobby_update", (data) => {
    renderPlayers(data.players || []);
    renderStatus(data.players?.length || 0, data.max_players, data.countdown);
});

// =======================
// Render jugadores
// =======================
function renderPlayers(players) {
    if (!playersList) return;

    playersList.innerHTML = "";

    players.forEach((p) => {
        const li = document.createElement("li");
        li.textContent = p;
        playersList.appendChild(li);
    });
}

// =======================
// ⏳ Render estado del lobby
// (jugadores + countdown)
// =======================
function renderStatus(actuales, max, countdown) {
    if (!statusBox) return;

    const total = max ?? actuales;

    statusBox.innerHTML = `
        <p>Esperando jugadores…</p>
        <p><strong>${actuales} / ${total}</strong></p>
        <p class="countdown">⏳ ${countdown ?? 30}s</p>
    `;
}





// =======================
// 🚀 Redirección a la sala
// =======================
socket.on("redirect_to_game", (data) => {
    if (!data?.url) return;

    statusBox.innerHTML = `
        <p>🎱 Sala lista</p>
        <p>Entrando a la partida…</p>
    `;

    setTimeout(() => {
        window.location.href = data.url;
    }, 1000);
});

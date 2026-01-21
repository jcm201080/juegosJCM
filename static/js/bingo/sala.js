import {
    renderCarton,
    setBolasCantadas
} from "./cartones.js";

const socket = io();

// =======================
// Conexión
// =======================
socket.on("connect", () => {
    console.log("✅ Socket conectado:", socket.id);
});

socket.on("disconnect", () => {
    console.log("❌ Socket desconectado");
});

// =======================
// Datos de la sala
// =======================
const codigo = document.querySelector("strong").innerText;

let nombre = prompt("Tu nombre para el bingo:");
if (!nombre) nombre = "Jugador";

// =======================
// Botón sacar bola (solo host)
// =======================
const newBallBtn = document.getElementById("newBallBtn");

if (newBallBtn) {
    newBallBtn.addEventListener("click", () => {
        socket.emit("new_ball", { codigo });
    });
}

// =======================
// Unirse a la sala
// =======================
socket.emit("join_bingo", { codigo, nombre });

// =======================
// Estado jugadores
// =======================
socket.on("lista_jugadores", data => {
    const estado = document.getElementById("estado");
    const btn = document.getElementById("newBallBtn");

    estado.innerHTML = `
        <p>
            Esperando jugadores…
            <strong>(${data.actuales}/${data.max})</strong>
        </p>
    `;

    if (data.host && data.actuales >= 2) {
        btn.style.display = "inline-block";
        btn.disabled = false;
    } else {
        btn.style.display = "none";
    }
});

// =======================
// Sala llena
// =======================
socket.on("sala_llena", () => {
    alert("La sala está llena");
    window.location.href = "/bingo";
});

// =======================
// Cartón recibido
// =======================
socket.on("send_carton", data => {
    renderCarton(data.carton);
});

// =======================
// Bola cantada
// =======================
socket.on("bola_cantada", data => {
    setBolasCantadas(data.historial);
    mostrarBola(data.bola);
});

// UI simple (luego la mejoramos)
function mostrarBola(bola) {
    alert("🎱 Ha salido el " + bola);
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

// =======================
// Confirmaciones
// =======================
socket.on("salida_ok", () => {
    window.location.href = "/bingo";
});

socket.on("sala_cerrada", () => {
    alert("El host ha cerrado la sala");
    window.location.href = "/bingo";
});

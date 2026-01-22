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
// Botón iniciar partida (solo host)
// =======================
const startGameBtn = document.getElementById("startGameBtn");

if (startGameBtn) {
    startGameBtn.addEventListener("click", () => {
        socket.emit("start_game", { codigo });
        startGameBtn.style.display = "none";
    });
}

//  =======================
// Partida iniciada
// =======================

socket.on("game_started", () => {
    console.log("🎬 Partida iniciada");
});


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

    // Botón iniciar partida SOLO host
    if (data.host && data.actuales >= 2 && !data.en_partida) {
        startGameBtn.style.display = "inline-block";
    } else {
        startGameBtn.style.display = "none";
    }

    // Botón sacar bola SOLO cuando la partida ha empezado
    if (data.host && data.en_partida) {
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
    renderHistorial(data.historial); // 👈 ESTO ES LO QUE FALTABA
});


//mostrar historial de bolas
function renderHistorial(bolas) {
    const contenedor = document.querySelector(".historial-bolas");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    bolas.forEach((bola, index) => {
        const span = document.createElement("span");
        span.classList.add("bola-historial");

        // ⭐ última bola destacada
        if (index === bolas.length - 1) {
            span.classList.add("ultima");
        }

        span.textContent = bola;
        contenedor.appendChild(span);
    });
}




// UI simple para mostrar la última bola
function mostrarBola(bola) {
    const ultimaBola = document.getElementById("ultima-bola");
    if (!ultimaBola) return;

    ultimaBola.innerHTML = `🎱 <strong>Bola actual:</strong> ${bola}`;
    ultimaBola.classList.remove("flash");
    void ultimaBola.offsetWidth; // truco para reiniciar animación
    ultimaBola.classList.add("flash");
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

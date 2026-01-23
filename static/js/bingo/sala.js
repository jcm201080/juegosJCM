import { renderCarton, setBolasCantadas } from "./cartones.js";
import { initAutoPlay } from "./autoplay.js";

const socket = io();

// =======================
// Datos de la sala
// =======================
const codigo = document.querySelector("strong").innerText;



//Eventos y lógica de la sala de bingo:CANTAR bingo y linea

const btnLinea = document.getElementById("btnLinea");
const btnBingo = document.getElementById("btnBingo");

if (btnLinea) {
    btnLinea.addEventListener("click", () => {
        socket.emit("cantar_linea", { codigo });
    });
}

if (btnBingo) {
    btnBingo.addEventListener("click", () => {
        socket.emit("cantar_bingo", { codigo });
    });
}




// =======================
// Inicializar autoplay
// =======================
initAutoPlay({ socket, codigo });


// =======================
// Conexión
// =======================
socket.on("connect", () => {
    console.log("✅ Socket conectado:", socket.id);

    // ✅ AHORA sí entramos en la sala
    socket.emit("join_bingo", { codigo });
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
        socket.emit("new_ball", { codigo });
    });
}

// =======================
// Botón iniciar partida
// =======================
const startGameBtn = document.getElementById("startGameBtn");

if (startGameBtn) {
    startGameBtn.addEventListener("click", () => {
        socket.emit("start_game", { codigo });
        startGameBtn.style.display = "none";
    });
}




// =======================
// Estado jugadores
// =======================
socket.on("lista_jugadores", data => {
    const estado = document.getElementById("estado");

    const autoBtn = document.getElementById("autoPlayBtn");
    const pauseBtn = document.getElementById("pauseAutoBtn");
    const countdown = document.getElementById("autoCountdown");

    const btnLinea = document.getElementById("btnLinea");
    const btnBingo = document.getElementById("btnBingo");

    estado.innerHTML = `
        <p>
            Esperando jugadores…
            <strong>(${data.actuales}/${data.max})</strong>
        </p>
    `;

    // ───────── INICIAR PARTIDA (solo host) ─────────
    if (data.host && data.actuales >= 2 && !data.en_partida) {
        startGameBtn.style.display = "inline-block";
    } else {
        startGameBtn.style.display = "none";
    }

    // ───────── SACAR BOLA (solo host y partida iniciada) ─────────
    if (data.host && data.en_partida) {
        newBallBtn.style.display = "inline-block";
        newBallBtn.disabled = false;
    } else {
        newBallBtn.style.display = "none";
    }

    // ───────── AUTOPLAY ─────────
    if (data.host && data.en_partida) {
        // El host ve el botón Auto (Pausa lo gestiona autoplay.js)
        autoBtn.style.display = "inline-block";
    } else {
        // Los jugadores NO host no ven controles
        autoBtn.style.display = "none";
        pauseBtn.style.display = "none";
        countdown.style.display = "none";
    }

    // 🔒 Línea
    if (data.linea_cantada) {
        btnLinea.disabled = true;
        btnLinea.classList.add("disabled");
    } else {
        btnLinea.disabled = false;
        btnLinea.classList.remove("disabled");
    }

    // 🏆 Bingo
    if (data.bingo_cantado) {
        btnBingo.disabled = true;
        btnBingo.classList.add("disabled");
    } else {
        btnBingo.disabled = false;
        btnBingo.classList.remove("disabled");
    }
});



// =======================
// Partida iniciada
// =======================
socket.on("game_started", () => {
    console.log("🎬 Partida iniciada");
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
    renderHistorial(data.historial);
});

// =======================
// Historial de bolas
// =======================
function renderHistorial(bolas) {
    const contenedor = document.querySelector(".historial-bolas");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    bolas.forEach((bola, index) => {
        const span = document.createElement("span");
        span.classList.add("bola-historial");

        if (index === bolas.length - 1) {
            span.classList.add("ultima");
        }

        span.textContent = bola;
        contenedor.appendChild(span);
    });
}

// =======================
// Última bola visual
// =======================
function mostrarBola(bola) {
    const ultimaBola = document.getElementById("ultima-bola");
    if (!ultimaBola) return;

    ultimaBola.innerHTML = `🎱 <strong>Bola actual:</strong> ${bola}`;
    ultimaBola.classList.remove("flash");
    void ultimaBola.offsetWidth;
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

socket.on("salida_ok", () => {
    window.location.href = "/bingo";
});

socket.on("sala_cerrada", () => {
    alert("El host ha cerrado la sala");
    window.location.href = "/bingo";
});


// =======================
// FEEDBACK LINEA / BINGO
// =======================
socket.on("linea_valida", () => {
    alert("🎯 ¡LÍNEA!");
});

socket.on("bingo_valido", () => {
    alert("🏆 ¡BINGO!");
});

socket.on("linea_invalida", () => {
    alert("❌ Línea incorrecta");
});

socket.on("bingo_invalido", () => {
    alert("❌ Bingo incorrecto");
});

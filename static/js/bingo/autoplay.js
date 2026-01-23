/**
 * Inicializa controles de autoplay (SOLO UI)
 * El tiempo y las bolas las controla el servidor
 */
export function initAutoPlay({ socket, codigo }) {

    const autoBtn = document.getElementById("autoPlayBtn");
    const pauseBtn = document.getElementById("pauseAutoBtn");
    const countdown = document.getElementById("autoCountdown");

    if (!autoBtn || !pauseBtn || !countdown) return;

    // ▶️ Iniciar autoplay (solo avisa al servidor)
    autoBtn.addEventListener("click", () => {
        socket.emit("start_autoplay", { codigo });

        autoBtn.style.display = "none";
        pauseBtn.style.display = "inline-block";
        countdown.style.display = "inline-block";
    });

    // ⏸ Pausar autoplay
    pauseBtn.addEventListener("click", () => {
        socket.emit("stop_autoplay", { codigo });

        pauseBtn.style.display = "none";
        autoBtn.style.display = "inline-block";
        countdown.style.display = "none";
    });

    // ⏳ Contador sincronizado (para TODOS)
    socket.on("autoplay_tick", data => {
        countdown.textContent = `⏳ ${data.seconds}s`;
    });

    // 🛑 Pausa forzada (ej. host sale)
    socket.on("autoplay_paused", () => {
        pauseBtn.style.display = "none";
        autoBtn.style.display = "inline-block";
        countdown.style.display = "none";
    });
}

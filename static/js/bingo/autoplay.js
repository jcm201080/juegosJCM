/**
 * Inicializa controles de autoplay (SOLO UI)
 * El tiempo y las bolas las controla el servidor
 */
export function initAutoPlay({ socket, codigo }) {
    const autoBtn = document.getElementById("autoPlayBtn");
    const pauseBtn = document.getElementById("pauseAutoBtn");
    const countdown = document.getElementById("autoCountdown");
    const intervalSelect = document.getElementById("intervalSelect");

    if (!autoBtn || !pauseBtn || !countdown || !intervalSelect) return;

    // ▶️ Iniciar autoplay
    autoBtn.addEventListener("click", () => {
        const interval = parseInt(intervalSelect.value);

        socket.emit("start_autoplay", {
            codigo,
            interval,
        });

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

    // ⏳ Contador sincronizado
    socket.on("autoplay_tick", (data) => {
        countdown.textContent = `⏳ ${data.seconds}s`;
    });

    // 🛑 Pausa forzada
    socket.on("autoplay_paused", () => {
        pauseBtn.style.display = "none";
        autoBtn.style.display = "inline-block";
        countdown.style.display = "none";
    });
}

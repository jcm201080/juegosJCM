/**
 * Autoplay SOLO para Bingo Classic
 * El servidor controla tiempo y bolas
 */
export function initAutoPlayClassic({ socket, codigo }) {
    const autoBtn = document.getElementById("autoPlayBtn");
    const pauseBtn = document.getElementById("pauseAutoBtn");
    const countdown = document.getElementById("autoCountdown");
    const intervalSelect = document.getElementById("intervalSelect");

    if (!autoBtn || !pauseBtn || !countdown || !intervalSelect) {
        console.warn("⚠️ Autoplay classic: elementos no encontrados");
        return;
    }

    autoBtn.addEventListener("click", () => {
        const interval = parseInt(intervalSelect.value, 10) || 20;

        console.log("▶️ Autoplay classic START", interval);

        socket.emit("start_autoplay", {
            codigo,
            interval,
        });

        autoBtn.style.display = "none";
        pauseBtn.style.display = "inline-block";
        countdown.style.display = "inline-block";
    });

    pauseBtn.addEventListener("click", () => {
        console.log("⏸ Autoplay classic STOP");

        socket.emit("stop_autoplay", { codigo });

        pauseBtn.style.display = "none";
        autoBtn.style.display = "inline-block";
        countdown.style.display = "none";
    });

    socket.on("autoplay_tick", (data) => {
        countdown.textContent = `⏳ ${data.seconds}s`;
    });

    socket.on("autoplay_paused", () => {
        pauseBtn.style.display = "none";
        autoBtn.style.display = "inline-block";
        countdown.style.display = "none";
    });
}

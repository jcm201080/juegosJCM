/* global Chart, visitasDiaData */

document.addEventListener("DOMContentLoaded", () => {
    const ctx = document.getElementById("visitasDiaChart");
    if (!ctx || typeof visitasDiaData === "undefined") return;

    new Chart(ctx, {
        type: "line",
        data: visitasDiaData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: "#fff" },
                },
            },
            scales: {
                x: {
                    ticks: { color: "#ccc" },
                },
                y: {
                    ticks: { color: "#ccc" },
                },
            },
        },
    });
});

function guardarNombre() {
    const input = document.getElementById("nombreJugador");
    const nombre = input ? input.value.trim() : "Jugador";
    localStorage.setItem("bingo_nombre", nombre);
}

function unirseSala() {
    const codigo = document.getElementById("codigoSala").value.trim().toUpperCase();
    if (!codigo) return;

    guardarNombre();
    window.location.href = `/bingo/classic/${codigo}`;
}

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btnUnirse");
    if (btn) {
        btn.addEventListener("click", unirseSala);
    }
});

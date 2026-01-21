function unirseSala() {
    const codigo = document.getElementById("codigoSala").value.trim().toUpperCase();

    if (!codigo) {
        alert("Introduce un código de sala");
        return;
    }

    window.location.href = `/bingo/${codigo}`;
}

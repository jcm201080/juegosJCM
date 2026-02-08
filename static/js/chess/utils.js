export function isWhitePiece(piece) {
    return "♙♖♘♗♕♔".includes(piece);
}

export function isBlackPiece(piece) {
    return "♟♜♞♝♛♚".includes(piece);
}


export function renderCoordinates(view = "white") {
    const filesTop = document.querySelector(".files.top");
    const filesBottom = document.querySelector(".files.bottom");
    const ranksLeft = document.querySelector(".ranks.left");
    const ranksRight = document.querySelector(".ranks.right");

    filesTop.innerHTML = "";
    filesBottom.innerHTML = "";
    ranksLeft.innerHTML = "";
    ranksRight.innerHTML = "";

    let files = ["a","b","c","d","e","f","g","h"];
    let ranks = ["8","7","6","5","4","3","2","1"];

    if (view === "black") {
        files = files.reverse();                // h → a
        ranks = ranks.reverse();                // 1 → 8
    }

    // Letras
    files.forEach(f => {
        filesTop.innerHTML += `<span>${f}</span>`;
        filesBottom.innerHTML += `<span>${f}</span>`;
    });

    // Números
    ranks.forEach(r => {
        ranksLeft.innerHTML += `<span>${r}</span>`;
        ranksRight.innerHTML += `<span>${r}</span>`;
    });
}


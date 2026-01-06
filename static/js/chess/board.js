export const board = [
  ["♜","♞","♝","♛","♚","♝","♞","♜"],
  ["♟","♟","♟","♟","♟","♟","♟","♟"],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["♙","♙","♙","♙","♙","♙","♙","♙"],
  ["♖","♘","♗","♕","♔","♗","♘","♖"]
];

export function renderBoard(board, boardEl, onSquareClick) {
    boardEl.innerHTML = "";

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = document.createElement("div");
            square.className = `square ${(r + c) % 2 === 0 ? "white" : "black"}`;
            square.textContent = board[r][c];
            square.onclick = () => onSquareClick(r, c);
            boardEl.appendChild(square);
        }
    }
}

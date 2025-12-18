// static/js/juegos_en_linea.js
document.addEventListener("DOMContentLoaded", () => {
  if (typeof window.initTicTacToe === "function") window.initTicTacToe();
  if (typeof window.initConnect4 === "function") window.initConnect4();
});

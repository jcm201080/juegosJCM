// static/js/puzzle_mate.js

document.addEventListener("DOMContentLoaded", () => {
    console.log("puzzle_mate.js cargado ✅");

    // === CONFIGURACIÓN DE DIFICULTADES =====================================
    const difficultyConfigs = {
        easy:   { lives: 4, ops: ["+", "-"] },
        medium: { lives: 3, ops: ["+", "-", "×"] },
        pro:    { lives: 3, ops: ["+", "-", "×", "÷"] },
        infernal: { lives: 2, ops: ["+", "-", "×", "÷"] }
    };

    // === PLANTILLA DE TABLERO ==============================================
    const BOARD_TEMPLATE = {
        rows: 7,
        cols: 17,
        baseGrid: Array.from({ length: 7 }, () => Array(17).fill(" ")),
        equations: [
            // Fila 1
            { cells: [[1, 2], [1, 3], [1, 4], [1, 5], [1, 6]] },
            { cells: [[1,10], [1,11], [1,12], [1,13], [1,14]] },

            // Fila 3
            { cells: [[3, 2], [3, 3], [3, 4], [3, 5], [3, 6]] },
            { cells: [[3,10], [3,11], [3,12], [3,13], [3,14]] },

            // Fila 5
            { cells: [[5, 2], [5, 3], [5, 4], [5, 5], [5, 6]] },
            { cells: [[5,10], [5,11], [5,12], [5,13], [5,14]] }
        ]
    };

    // === ESTADO GLOBAL ======================================================
    const API_BASE = window.location.origin;

    // Usuario actual (viene de auth.js → window.JCM_USER)
    let currentUser = window.JCM_USER || null;

    let currentDifficulty = "easy";
    let currentConfig = difficultyConfigs[currentDifficulty];
    let currentPuzzle = null;
    let selectedTile = null;
    let lives = 0;

    // stats de la partida
    let mistakes = 0;
    let startTime = null;   // Date
    let finished = false;   // cuando se acaba (win/fail) para no seguir jugando

    // === REFERENCIAS DOM ====================================================
    const puzzleUserGuest  = document.getElementById("puzzleUserGuest");
    const puzzleUserLogged = document.getElementById("puzzleUserLogged");
    const puzzleUserName   = document.getElementById("puzzleUserName");

    const boardDiv        = document.getElementById("board");
    const numbersDiv      = document.getElementById("numbers");
    const messageDiv      = document.getElementById("message");
    const livesSpan       = document.getElementById("lives");
    const solvedCountSpan = document.getElementById("solvedCount");
    const totalEqSpan     = document.getElementById("totalEq");

    const restartBtn      = document.getElementById("restartBtn");
    const newPuzzleBtn    = document.getElementById("newPuzzleBtn");
    const difficultySelect= document.getElementById("difficultySelect");
    const sortNumbersBtn  = document.getElementById("sortNumbersBtn");

    // Sonidos
    const soundError    = new Audio("/static/sounds/penalizacion.mp3");
    const soundWin      = new Audio("/static/sounds/victoria.mp3");
    const soundGameOver = new Audio("/static/sounds/muerte.mp3");

    // Ranking / historial (si no existen en el HTML, el código los ignora)
    const puzzleGlobalRankingList     = document.getElementById("puzzleGlobalRankingList");
    const puzzleDifficultyRankingList = document.getElementById("puzzleDifficultyRankingList");
    const puzzleDiffTitle             = document.getElementById("puzzleDiffTitle");
    const puzzleHistoryList           = document.getElementById("puzzleHistoryList");
    const puzzleShowHistoryBtn        = document.getElementById("puzzleShowHistoryBtn");

    // Comprobación de DOM mínimo
    if (!boardDiv || !numbersDiv) {
        console.error("❌ No se encontraron #board o #numbers en el DOM.");
        return;
    }

    // === SINCRONIZAR USUARIO CON AUTH.JS ===================================
    function updatePuzzleUserUI() {
        if (!puzzleUserGuest || !puzzleUserLogged) return;

        if (currentUser) {
            puzzleUserGuest.classList.add("hidden");
            puzzleUserLogged.classList.remove("hidden");
            if (puzzleUserName) {
                puzzleUserName.textContent = currentUser.username;
            }
        } else {
            puzzleUserGuest.classList.remove("hidden");
            puzzleUserLogged.classList.add("hidden");
            if (puzzleUserName) {
                puzzleUserName.textContent = "";
            }
        }
    }

    // Estado inicial
    updatePuzzleUserUI();

    // Escuchar cambios desde auth.js
    window.addEventListener("jcm:user-changed", (ev) => {
        const user = ev.detail ? ev.detail.user : null;
        console.log("👤 jcm:user-changed en puzzle_mate.js:", user);
        currentUser = user || null;
        updatePuzzleUserUI();
    });


    // === ORDENAR NÚMEROS ====================================================
        function sortNumbers() {
        if (!numbersDiv) return;

        const tiles = Array.from(numbersDiv.querySelectorAll(".num-tile"));

        tiles.sort((a, b) => {
            const va = Number(a.dataset.value);
            const vb = Number(b.dataset.value);
            return va - vb;  // orden ascendente
        });

        tiles.forEach(tile => numbersDiv.appendChild(tile));

        if (messageDiv) {
            messageDiv.textContent = "Números ordenados.";
        }
    }


    // === UTILIDADES =========================================================
    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function choice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function renderLives() {
        if (!livesSpan) return;
        livesSpan.innerHTML = "";
        for (let i = 0; i < lives; i++) {
            const heart = document.createElement("span");
            heart.textContent = "❤";
            livesSpan.appendChild(heart);
        }
    }

    function getCellElement(row, col) {
        const rowDiv = boardDiv.children[row];
        if (!rowDiv) return null;
        return rowDiv.children[col] || null;
    }

    function getElapsedSeconds() {
        if (!startTime) return 0;
        const now = new Date();
        return Math.round((now - startTime) / 1000);
    }

    function formatDateTime(str) {
        if (!str) return "";
        const d = new Date(str);
        if (isNaN(d.getTime())) return str;
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        return `${dd}/${mm}/${yy} ${hh}:${mi}`;
    }

    // Genera A, B, R para A op B = R
    function generateEquationValues(op) {
        let A, B, R;
        switch (op) {
            case "+":
                A = randomInt(1, 20);
                B = randomInt(1, 20);
                R = A + B;
                break;
            case "-":
                A = randomInt(5, 30);
                B = randomInt(1, A - 1);
                R = A - B;
                break;
            case "×":
                A = randomInt(2, 10);
                B = randomInt(2, 10);
                R = A * B;
                break;
            case "÷":
                B = randomInt(2, 10);
                R = randomInt(1, 10);
                A = B * R;
                break;
            default:
                A = 1; B = 1; R = 2;
        }
        return { A, B, R, op };
    }

    // Decide qué posiciones son blancas según dificultad
    function chooseBlankPositions(diff) {
        if (diff === "easy") {
            const options = [[2], [0], [4], [0, 2]];
            return choice(options);
        }
        if (diff === "medium") {
            const options = [[0, 2], [2, 4]];
            return choice(options);
        }
        if (diff === "pro") {
            const options = [[0, 2], [0, 4], [2, 4]];
            return choice(options);
        }
        // infernal
        return [0, 2, 4];
    }

    // === GENERAR PUZZLE =====================================================
    function generatePuzzle(config) {
        const grid = BOARD_TEMPLATE.baseGrid.map(row => [...row]);
        const equations = [];
        const numbersPool = [];

        BOARD_TEMPLATE.equations.forEach(eqDef => {
            const opAllowed = choice(config.ops);
            const { A, B, R, op } = generateEquationValues(opAllowed);
            const values = [A, op, B, "=", R];

            const cells = eqDef.cells.map(([r, c]) => [r, c]);
            const blanksPositions = chooseBlankPositions(currentDifficulty);

            cells.forEach(([r, c], i) => {
                if (i === 1) {
                    grid[r][c] = op;
                } else if (i === 3) {
                    grid[r][c] = "=";
                } else {
                    const val = values[i];
                    if (blanksPositions.includes(i)) {
                        grid[r][c] = "B";
                        numbersPool.push(val);
                    } else {
                        grid[r][c] = String(val); // pista fija
                    }
                }
            });

            equations.push({ cells, blanksPositions, solved: false });
        });

        return {
            lives: config.lives,
            grid,
            equations,
            numbers: numbersPool
        };
    }

    // === CARGA / RENDER =====================================================
    function loadPuzzle(puzzle, config) {
        currentPuzzle = puzzle;
        currentConfig = config;

        selectedTile = null;
        lives = puzzle.lives;
        mistakes = 0;
        finished = false;
        startTime = new Date();

        puzzle.equations.forEach(eq => eq.solved = false);

        boardDiv.innerHTML = "";
        numbersDiv.innerHTML = "";
        if (messageDiv) messageDiv.textContent = "";

        renderLives();
        if (solvedCountSpan) solvedCountSpan.textContent = 0;
        if (totalEqSpan)    totalEqSpan.textContent = puzzle.equations.length;

        // Tablero
        puzzle.grid.forEach((row, r) => {
            const rowDiv = document.createElement("div");
            rowDiv.className = "row";
            row.forEach((cellContent, c) => {
                const cell = document.createElement("div");

                if (cellContent === " ") {
                    cell.className = "cell empty";
                } else if (cellContent === "B") {
                    cell.className = "cell blank";
                    cell.dataset.row = r;
                    cell.dataset.col = c;
                    cell.textContent = "";
                    cell.dataset.tileIndex = "";
                    cell.addEventListener("click", () => onBlankClick(cell));
                } else {
                    cell.className = "cell static";
                    cell.textContent = cellContent;
                }
                rowDiv.appendChild(cell);
            });
            boardDiv.appendChild(rowDiv);
        });

        // Números
        const nums = shuffle(puzzle.numbers);
        nums.forEach((num, idx) => {
            const tile = document.createElement("div");
            tile.className = "num-tile";
            tile.textContent = num;
            tile.dataset.value = num;
            tile.dataset.index = idx;
            tile.addEventListener("click", () => onNumberClick(tile));
            numbersDiv.appendChild(tile);
        });
    }

    // === ENVÍO RESULTADO AL BACKEND ========================================
    async function sendPuzzleResult() {
        if (!currentUser) return;          // solo si hay usuario logueado
        if (!currentPuzzle) return;

        const solved = currentPuzzle.equations.filter(eq => eq.solved).length;
        const total_eq = currentPuzzle.equations.length;
        const lives_left = Math.max(lives, 0);
        const duration_sec = getElapsedSeconds();

        try {
            const res = await fetch(`${API_BASE}/api/puzzle_score`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    difficulty: currentDifficulty,
                    solved,
                    total_eq,
                    mistakes,
                    lives_left,
                    duration_sec
                })
            });

            const data = await res.json();
            if (!data.success) {
                console.warn("No se pudo guardar la partida de puzzle:", data.error);
                return;
            }

            console.log("✅ Puzzle guardado:", data);

            // refrescamos rankings/historial
            loadPuzzleGlobalRanking();
            loadPuzzleDifficultyRanking();
            loadPuzzleHistory();

        } catch (err) {
            console.error(err);
        }
    }

    // === INTERACCIONES ======================================================
    function onNumberClick(tile) {
        if (tile.classList.contains("used")) return;

        document.querySelectorAll(".num-tile").forEach(t => t.classList.remove("selected"));
        selectedTile = tile;
        tile.classList.add("selected");
        if (messageDiv) messageDiv.textContent = `Número seleccionado: ${tile.dataset.value}`;
    }

        function onBlankClick(cell) {
        const puzzle = currentPuzzle;
        if (!puzzle || finished) return;

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        // Ecuaciones que pasan por esta casilla
        const relatedEqs = puzzle.equations.filter(eq =>
            eq.cells.some(([er, ec]) => er === row && ec === col)
        );

        // 1) QUITAR NÚMERO (click en blanco con número y sin ficha seleccionada)
        if (cell.textContent.trim() !== "" && !selectedTile) {
            const idx = cell.dataset.tileIndex;
            if (idx !== "") {
                const tile = document.querySelector(`.num-tile[data-index="${idx}"]`);
                if (tile) tile.classList.remove("used");
            }
            cell.textContent = "";
            cell.dataset.tileIndex = "";

            // Esta casilla formaba parte de una ecuación que estaba marcada como OK → la reseteamos
            relatedEqs.forEach(resetEquation);
            updateSolvedCount();

            if (messageDiv) messageDiv.textContent = "Número devuelto a la bandeja.";
            return;
        }

        // 2) CAMBIAR NÚMERO (ya hay número y hemos seleccionado otro)
        if (cell.textContent.trim() !== "" && selectedTile) {
            const oldIdx = cell.dataset.tileIndex;
            if (oldIdx !== "") {
                const oldTile = document.querySelector(`.num-tile[data-index="${oldIdx}"]`);
                if (oldTile) oldTile.classList.remove("used");
            }

            // Al cambiar una casilla de una ecuación que ya estaba en verde,
            // hay que volver a dejarla "sin resolver"
            relatedEqs.forEach(resetEquation);
            updateSolvedCount();
        }

        // 3) COLOCAR NUEVO NÚMERO
        if (!selectedTile || selectedTile.classList.contains("used")) {
            if (messageDiv) messageDiv.textContent = "Selecciona primero un número de la bandeja.";
            return;
        }

        const value = selectedTile.dataset.value;
        cell.textContent = value;
        cell.dataset.tileIndex = selectedTile.dataset.index;

        selectedTile.classList.add("used");
        selectedTile.classList.remove("selected");
        const usedTile = selectedTile;
        selectedTile = null;

        // 4) COMPROBAR ECUACIONES QUE PASAN POR ESTA CASILLA
        for (const eq of relatedEqs) {
            if (eq.solved) continue; // (si se volvió a marcar como false arriba, sí entra)

            if (isEquationComplete(eq, puzzle)) {
                const ok = evaluateEquation(eq, puzzle);

                if (!ok) {
                    // Incorrecta → quitamos el número de la casilla y devolvemos ficha
                    cell.textContent = "";
                    cell.dataset.tileIndex = "";
                    usedTile.classList.remove("used");

                    lives--;
                    mistakes++;
                    renderLives();
                    flashEquation(eq);
                    if (messageDiv) messageDiv.textContent = "Operación incorrecta. Pierdes una vida 💔";
                    try { soundError.currentTime = 0; soundError.play(); } catch(e){}

                    if (lives <= 0) {
                        finished = true;
                        if (messageDiv) messageDiv.textContent = "💀 Te has quedado sin vidas. Puzzle fallido.";
                        try { soundGameOver.currentTime = 0; soundGameOver.play(); } catch(e){}
                        disableAllBlanks();
                        sendPuzzleResult();
                    }
                    return;
                } else {
                    // Correcta → marcamos en verde
                    eq.solved = true;
                    markEquationOk(eq);
                    updateSolvedCount();
                    if (messageDiv) messageDiv.textContent = "¡Operación correcta! ✅";

                    // ¿Todas resueltas?
                    if (puzzle.equations.every(e => e.solved)) {
                        finished = true;
                        if (messageDiv) messageDiv.textContent = "🎉 ¡Has completado el puzzle!";
                        try { soundWin.currentTime = 0; soundWin.play(); } catch(e){}
                        sendPuzzleResult();
                    }
                }
            }
        }
    }


    function isEquationComplete(eq, puzzle) {
        for (const [r, c] of eq.cells) {
            if (puzzle.grid[r][c] === "B") {
                const cell = getCellElement(r, c);
                if (!cell || cell.textContent.trim() === "") return false;
            }
        }
        return true;
    }

    function getNumberAt(r, c, puzzle) {
        const token = puzzle.grid[r][c];
        if (token === "B") {
            const cell = getCellElement(r, c);
            return parseInt(cell.textContent, 10);
        } else {
            return parseInt(token, 10);
        }
    }

    function evaluateEquation(eq, puzzle) {
        const [cA, cOp, cB, , cR] = eq.cells;
        const opToken = puzzle.grid[cOp[0]][cOp[1]];

        const a = getNumberAt(cA[0], cA[1], puzzle);
        const b = getNumberAt(cB[0], cB[1], puzzle);
        const r = getNumberAt(cR[0], cR[1], puzzle);

        let computed;
        switch (opToken) {
            case "+": computed = a + b; break;
            case "-": computed = a - b; break;
            case "×": computed = a * b; break;
            case "÷": computed = a / b; break;
            default:  return false;
        }
        return computed === r;
    }

    function markEquationOk(eq) {
        for (const [r, c] of eq.cells) {
            const cell = getCellElement(r, c);
            if (cell && !cell.classList.contains("empty")) {
                cell.classList.add("equation-ok");
            }
        }
    }

    function flashEquation(eq) {
        for (const [r, c] of eq.cells) {
            const cell = getCellElement(r, c);
            if (cell && cell.classList.contains("blank")) {
                cell.classList.add("wrong-flash");
                setTimeout(() => cell.classList.remove("wrong-flash"), 300);
            }
        }
    }
    function resetEquation(eq) {
        // Marcar como no resuelta
        eq.solved = false;

        // Quitar el fondo verde de todas sus celdas
        for (const [r, c] of eq.cells) {
            const cell = getCellElement(r, c);
            if (cell) {
                cell.classList.remove("equation-ok");
            }
        }
    }


    function disableAllBlanks() {
        document.querySelectorAll(".blank").forEach(cell => {
            cell.replaceWith(cell.cloneNode(true));
        });
    }

    function updateSolvedCount() {
        if (!solvedCountSpan) return;
        const solved = currentPuzzle.equations.filter(eq => eq.solved).length;
        solvedCountSpan.textContent = solved;
    }

    // === RANKING / HISTORIAL (FRONT) =======================================
    function renderRanking(ranking, ulElement) {
        if (!ulElement) return;
        ulElement.innerHTML = "";
        if (!ranking.length) {
            const li = document.createElement("li");
            li.textContent = "Sin partidas todavía.";
            ulElement.appendChild(li);
            return;
        }
        ranking.forEach((item, idx) => {
            const li = document.createElement("li");
            li.textContent =
                `${idx + 1}. ${item.username} — ${item.best_score} puntos (partidas: ${item.games_played})`;
            ulElement.appendChild(li);
        });
    }

    async function loadPuzzleGlobalRanking() {
        if (!puzzleGlobalRankingList) return;
        try {
            const res = await fetch(`${API_BASE}/api/puzzle_ranking`);
            const data = await res.json();
            if (data.success && data.ranking) {
                renderRanking(data.ranking, puzzleGlobalRankingList);
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function loadPuzzleDifficultyRanking() {
        if (!puzzleDifficultyRankingList) return;
        try {
            const res = await fetch(`${API_BASE}/api/puzzle_ranking?difficulty=${currentDifficulty}`);
            const data = await res.json();
            if (data.success && data.ranking) {
                if (puzzleDiffTitle) {
                    puzzleDiffTitle.textContent = `Dificultad: ${currentDifficulty}`;
                }
                renderRanking(data.ranking, puzzleDifficultyRankingList);
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function loadPuzzleHistory() {
        if (!currentUser || !puzzleHistoryList) return;
        try {
            const res = await fetch(`${API_BASE}/api/puzzle_history/${currentUser.id}`);
            const data = await res.json();
            if (!data.success) return;

            puzzleHistoryList.innerHTML = "";
            if (!data.history.length) {
                const li = document.createElement("li");
                li.textContent = "No hay partidas registradas todavía.";
                puzzleHistoryList.appendChild(li);
                return;
            }

            data.history.forEach((item) => {
                const li = document.createElement("li");
                li.textContent =
                    `[${item.difficulty}] resueltas ${item.solved}/${item.total_eq}, ` +
                    `fallos ${item.mistakes}, vidas ${item.lives_left}, ` +
                    `tiempo ${item.duration_sec}s, ` +
                    `puntuación ${item.score} — ${formatDateTime(item.created_at)}`;
                puzzleHistoryList.appendChild(li);
            });
        } catch (err) {
            console.error(err);
        }
    }

    // === EVENTOS DE UI ======================================================
    if (restartBtn) {
        restartBtn.addEventListener("click", () => {
            if (currentPuzzle && currentConfig) {
                loadPuzzle(currentPuzzle, currentConfig);
            }
        });
    }

    if (newPuzzleBtn) {
        newPuzzleBtn.addEventListener("click", () => {
            const cfg = difficultyConfigs[currentDifficulty];
            const puzzle = generatePuzzle(cfg);
            loadPuzzle(puzzle, cfg);
        });
    }

        if (sortNumbersBtn) {
        sortNumbersBtn.addEventListener("click", () => {
            sortNumbers();
        });
    }


    if (difficultySelect) {
        difficultySelect.addEventListener("change", () => {
            currentDifficulty = difficultySelect.value;
            const cfg = difficultyConfigs[currentDifficulty];
            const puzzle = generatePuzzle(cfg);
            loadPuzzle(puzzle, cfg);
            loadPuzzleDifficultyRanking();
        });
    }

    if (puzzleShowHistoryBtn && puzzleHistoryList) {
        puzzleShowHistoryBtn.addEventListener("click", () => {
            if (!currentUser) {
                alert("Inicia sesión para ver tu historial del puzzle.");
                return;
            }
            const hidden = puzzleHistoryList.style.display === "none" || puzzleHistoryList.style.display === "";
            puzzleHistoryList.style.display = hidden ? "block" : "none";
            if (hidden) loadPuzzleHistory();
        });
    }

    // === INICIO =============================================================
    currentConfig = difficultyConfigs[currentDifficulty];
    const firstPuzzle = generatePuzzle(currentConfig);
    loadPuzzle(firstPuzzle, currentConfig);
    console.log("Puzzle inicial cargado ✅");

    // Rankings iniciales (si existen las secciones en el HTML)
    loadPuzzleGlobalRanking();
    loadPuzzleDifficultyRanking();
});

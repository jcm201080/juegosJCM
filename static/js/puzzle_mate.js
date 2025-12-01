// === CONFIGURACIÓN DE DIFICULTADES =====================================
const difficultyConfigs = {
    easy: {
        lives: 4,
        ops: ["+", "-"]
    },
    medium: {
        lives: 3,
        ops: ["+", "-", "×"]
    },
    pro: {
        lives: 3,
        ops: ["+", "-", "×", "÷"]
    },
    infernal: {
        lives: 2,
        ops: ["+", "-", "×", "÷"]
    }
};

// === PLANTILLA DE TABLERO ==============================================
// 3 filas de cuentas (1, 3 y 5), cada una con una izquierda y otra derecha

const BOARD_TEMPLATE = {
    rows: 7,
    cols: 17,
    baseGrid: Array.from({ length: 7 }, () => Array(17).fill(" ")),

    equations: [
        // Fila 1 (índice 1) — centrado
        { cells: [[1, 2], [1, 3], [1, 4], [1, 5], [1, 6]] },
        { cells: [[1,10], [1,11], [1,12], [1,13], [1,14]] },

        // Fila 3 (índice 3)
        { cells: [[3, 2], [3, 3], [3, 4], [3, 5], [3, 6]] },
        { cells: [[3,10], [3,11], [3,12], [3,13], [3,14]] },

        // Fila 5 (índice 5)
        { cells: [[5, 2], [5, 3], [5, 4], [5, 5], [5, 6]] },
        { cells: [[5,10], [5,11], [5,12], [5,13], [5,14]] }
    ]
};



// === ESTADO GLOBAL ======================================================
let currentDifficulty = "easy";
let currentConfig = difficultyConfigs[currentDifficulty];
let currentPuzzle = null;
let selectedTile = null;
let lives = 0;

const boardDiv = document.getElementById("board");
const numbersDiv = document.getElementById("numbers");
const messageDiv = document.getElementById("message");
const livesSpan = document.getElementById("lives");
const solvedCountSpan = document.getElementById("solvedCount");
const totalEqSpan = document.getElementById("totalEq");

const restartBtn = document.getElementById("restartBtn");
const newPuzzleBtn = document.getElementById("newPuzzleBtn");
const difficultySelect = document.getElementById("difficultySelect");

// === SONIDOS ============================================================
const soundError    = new Audio("static/sounds/penalizacion.mp3");
const soundWin      = new Audio("static/sounds/victoria.mp3");
const soundGameOver = new Audio("sounds/muerte.mp3");

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
// Índices: 0 = A, 2 = B, 4 = R
function chooseBlankPositions(diff) {
    if (diff === "easy") {
        // fácil: 1 hueco casi siempre, a veces 2
        const options = [[2], [0], [4], [0,2]];
        return choice(options);
    }
    if (diff === "medium") {
        // medio: normalmente 2 huecos, siempre queda al menos 1 pista
        const options = [[0,2], [2,4]];
        return choice(options);
    }
    if (diff === "pro") {
        // pro: siempre 2 huecos
        const options = [[0,2], [0,4], [2,4]];
        return choice(options);
    }
    // infernal: A, B y R en blanco
    return [0,2,4];
}

// === GENERAR PUZZLE =====================================================
function generatePuzzle(config) {
    const rows = BOARD_TEMPLATE.rows;
    const cols = BOARD_TEMPLATE.cols;

    const grid = BOARD_TEMPLATE.baseGrid.map(row => [...row]);

    const equations = [];
    const numbersPool = [];

    BOARD_TEMPLATE.equations.forEach(eqDef => {
        const opAllowed = choice(config.ops);
        const { A, B, R, op } = generateEquationValues(opAllowed);
        const values = [A, op, B, "=", R];

        const cells = eqDef.cells.map(([r,c]) => [r,c]);

        const blanksPositions = chooseBlankPositions(currentDifficulty);

        cells.forEach(([r,c], i) => {
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
                    grid[r][c] = String(val); // pista
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
    puzzle.equations.forEach(eq => eq.solved = false);

    boardDiv.innerHTML = "";
    numbersDiv.innerHTML = "";
    messageDiv.textContent = "";

    renderLives();
    solvedCountSpan.textContent = 0;
    totalEqSpan.textContent = puzzle.equations.length;

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

    // Números (exactamente los necesarios)
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

// === INTERACCIONES ======================================================
function onNumberClick(tile) {
    if (tile.classList.contains("used")) return;

    document.querySelectorAll(".num-tile").forEach(t => t.classList.remove("selected"));
    selectedTile = tile;
    tile.classList.add("selected");
    messageDiv.textContent = `Número seleccionado: ${tile.dataset.value}`;
}

function onBlankClick(cell) {
    const puzzle = currentPuzzle;

    // 1) Deshacer si hay número y no hay ficha seleccionada
    if (cell.textContent.trim() !== "" && !selectedTile) {
        const idx = cell.dataset.tileIndex;
        if (idx !== "") {
            const tile = document.querySelector(`.num-tile[data-index="${idx}"]`);
            if (tile) tile.classList.remove("used");
        }
        cell.textContent = "";
        cell.dataset.tileIndex = "";
        messageDiv.textContent = "Número devuelto a la bandeja.";
        return;
    }

    // 2) Cambiar si hay número y sí hay ficha seleccionada
    if (cell.textContent.trim() !== "" && selectedTile) {
        const oldIdx = cell.dataset.tileIndex;
        if (oldIdx !== "") {
            const oldTile = document.querySelector(`.num-tile[data-index="${oldIdx}"]`);
            if (oldTile) oldTile.classList.remove("used");
        }
    }

    // 3) Colocar nuevo número
    if (!selectedTile || selectedTile.classList.contains("used")) {
        messageDiv.textContent = "Selecciona primero un número de la bandeja.";
        return;
    }

    const value = selectedTile.dataset.value;
    cell.textContent = value;
    cell.dataset.tileIndex = selectedTile.dataset.index;

    selectedTile.classList.add("used");
    selectedTile.classList.remove("selected");
    const usedTile = selectedTile;
    selectedTile = null;

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    const relatedEqs = puzzle.equations.filter(eq =>
        eq.cells.some(([er, ec]) => er === row && ec === col)
    );

    for (const eq of relatedEqs) {
        if (eq.solved) continue;

        if (isEquationComplete(eq, puzzle)) {
            const ok = evaluateEquation(eq, puzzle);

            if (!ok) {
                cell.textContent = "";
                cell.dataset.tileIndex = "";
                usedTile.classList.remove("used");
                lives--;
                renderLives();
                flashEquation(eq);
                messageDiv.textContent = "Operación incorrecta. Pierdes una vida 💔";
                try { soundError.currentTime = 0; soundError.play(); } catch(e){}

                if (lives <= 0) {
                    messageDiv.textContent = "💀 Te has quedado sin vidas. Puzzle fallido.";
                    try { soundGameOver.currentTime = 0; soundGameOver.play(); } catch(e){}
                    disableAllBlanks();
                }
                return;
            } else {
                eq.solved = true;
                markEquationOk(eq);
                updateSolvedCount();
                messageDiv.textContent = "¡Operación correcta! ✅";

                if (puzzle.equations.every(e => e.solved)) {
                    messageDiv.textContent = "🎉 ¡Has completado el puzzle!";
                    try { soundWin.currentTime = 0; soundWin.play(); } catch(e){}
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
    const [cA, cOp, cB, cEq, cR] = eq.cells;
    const opToken = puzzle.grid[cOp[0]][cOp[1]];

    const a = getNumberAt(cA[0], cA[1], puzzle);
    const b = getNumberAt(cB[0], cB[1], puzzle);
    const r = getNumberAt(cR[0], cR[1], puzzle);

    let computed;

    switch (opToken) {
        case "+":
            computed = a + b;
            break;
        case "-":
            computed = a - b;
            break;
        case "×":
            computed = a * b;
            break;
        case "÷":
            computed = a / b;
            break;
        default:
            return false;
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

function disableAllBlanks() {
    document.querySelectorAll(".blank").forEach(cell => {
        cell.replaceWith(cell.cloneNode(true));
    });
}

function updateSolvedCount() {
    const solved = currentPuzzle.equations.filter(eq => eq.solved).length;
    solvedCountSpan.textContent = solved;
}

// === EVENTOS DE UI ======================================================
restartBtn.addEventListener("click", () => {
    if (currentPuzzle && currentConfig) {
        loadPuzzle(currentPuzzle, currentConfig);
    }
});

newPuzzleBtn.addEventListener("click", () => {
    const cfg = difficultyConfigs[currentDifficulty];
    const puzzle = generatePuzzle(cfg);
    loadPuzzle(puzzle, cfg);
});

difficultySelect.addEventListener("change", () => {
    currentDifficulty = difficultySelect.value;
    const cfg = difficultyConfigs[currentDifficulty];
    const puzzle = generatePuzzle(cfg);
    loadPuzzle(puzzle, cfg);
});

// === INICIO =============================================================
currentConfig = difficultyConfigs[currentDifficulty];
const firstPuzzle = generatePuzzle(currentConfig);
loadPuzzle(firstPuzzle, currentConfig);

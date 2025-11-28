const timeEl = document.getElementById("time");
const scoreEl = document.getElementById("score");
const questionEl = document.getElementById("question");
const msgEl = document.getElementById("message");
const startBtn = document.getElementById("startBtn");
const answerButtons = document.querySelectorAll(".answer");

let timeLeft = 60;
let score = 0;
let timer = null;
let correctAnswer = null;
let playing = false;

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function newQuestion() {
    // Aquí puedes jugar con la dificultad (rangos, operadores, etc.)
    const a = randomInt(1, 50);
    const b = randomInt(1, 50);
    const operators = ["+", "-", "×"];
    const op = operators[randomInt(0, operators.length - 1)];

    let result;
    if (op === "+") result = a + b;
    else if (op === "-") result = a - b;
    else result = a * b;

    correctAnswer = result;
    questionEl.textContent = `${a} ${op} ${b}`;

    // Generar respuestas (1 correcta + 3 falsas)
    const answers = new Set([result]);
    while (answers.size < 4) {
        let fake = result + randomInt(-10, 10);
        if (fake === result) fake += randomInt(1, 5);
        answers.add(fake);
    }

    const answersArray = Array.from(answers).sort(() => Math.random() - 0.5);

    answerButtons.forEach((btn, idx) => {
        btn.textContent = answersArray[idx];
        btn.classList.remove("correct", "wrong");
    });
}

function startGame() {
    score = 0;
    timeLeft = 60;
    playing = true;
    scoreEl.textContent = score;
    timeEl.textContent = timeLeft;
    msgEl.textContent = "";
    startBtn.textContent = "Reiniciar";

    if (timer) clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        timeEl.textContent = timeLeft;
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);

    newQuestion();
}

function endGame() {
    playing = false;
    clearInterval(timer);
    msgEl.textContent = `⏹ Fin de la partida. Puntuación final: ${score}`;
    questionEl.textContent = "Pulsa 'Reiniciar' para jugar de nuevo";
}

answerButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        if (!playing) return;

        const value = Number(btn.textContent);
        if (value === correctAnswer) {
            score += 1;
            scoreEl.textContent = score;
            msgEl.textContent = "✅ ¡Correcto!";
            btn.classList.add("correct");
            setTimeout(newQuestion, 300);
        } else {
            msgEl.textContent = "❌ Ups, prueba la siguiente...";
            btn.classList.add("wrong");
        }
    });
});

startBtn.addEventListener("click", startGame);

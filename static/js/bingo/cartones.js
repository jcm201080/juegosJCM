// =======================
// Estado del cartón
// =======================

let bolasCantadas = [];
let numerosMarcados = new Set();

// =======================
// API pública del módulo
// =======================

export function setBolasCantadas(bolas) {
    bolasCantadas = bolas.map(Number);
}

// 👇 renderiza UN cartón en el contenedor que se le pase
export function renderCarton(carton, container) {
    if (!container) return;

    container.innerHTML = ""; // 🔑 limpiamos SOLO este cartón

    carton.forEach(fila => {
        const filaDiv = document.createElement("div");
        filaDiv.classList.add("fila");

        fila.forEach(numero => {
            const celdaDiv = document.createElement("div");
            celdaDiv.classList.add("celda");

            if (numero === "FREE") {
                celdaDiv.textContent = "⭐";
                celdaDiv.classList.add("marcada");
                numerosMarcados.add("FREE");
            } else {
                celdaDiv.textContent = numero;
                celdaDiv.dataset.numero = numero;

                // 🔁 marcar al hacer click (solo si ha salido)
                celdaDiv.addEventListener("click", () => {
                    intentarMarcar(celdaDiv, numero);
                });

                // ✅ marcar automáticamente si la bola ya salió
                if (bolasCantadas.includes(numero)) {
                    celdaDiv.classList.add("marcada");
                    numerosMarcados.add(numero);
                }
            }

            filaDiv.appendChild(celdaDiv);
        });

        container.appendChild(filaDiv);
    });
}

// =======================
// Lógica de marcado
// =======================

function intentarMarcar(celdaDiv, numero) {
    // ❌ Si la bola no ha salido, no se marca
    if (!bolasCantadas.includes(numero)) return;

    celdaDiv.classList.toggle("marcada");

    if (numerosMarcados.has(numero)) {
        numerosMarcados.delete(numero);
    } else {
        numerosMarcados.add(numero);
    }
}

// =======================
// Utilidades
// =======================

export function getNumerosMarcados() {
    return Array.from(numerosMarcados);
}

// 🔄 Marcar automáticamente en TODOS los cartones
export function marcarAutomaticos() {
    document.querySelectorAll(".celda").forEach(celda => {
        const numero = Number(celda.dataset.numero);
        if (!numero) return;

        if (bolasCantadas.includes(numero)) {
            celda.classList.add("marcada");
            numerosMarcados.add(numero);
        }
    });
}

// =======================
// Estado del cartón
// =======================

let bolasCantadas = [];
let numerosMarcados = new Set();

// =======================
// API pública del módulo
// =======================

export function setBolasCantadas(bolas) {
    bolasCantadas = bolas;
}

export function renderCarton(carton) {
    const container = document.getElementById("carton-container");
    container.innerHTML = ""; // limpiar si existía

    const contenedor = document.createElement("div");
    contenedor.classList.add("carton");

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

                celdaDiv.addEventListener("click", () => {
                    intentarMarcar(celdaDiv, numero);
                });
            }

            filaDiv.appendChild(celdaDiv);
        });

        contenedor.appendChild(filaDiv);
    });

    container.appendChild(contenedor);
}

// =======================
// Lógica de marcado
// =======================

function intentarMarcar(celdaDiv, numero) {
    // ❌ Si la bola no ha salido, no se marca
    if (!bolasCantadas.includes(numero)) {
        return;
    }

    // Toggle visual
    celdaDiv.classList.toggle("marcada");

    // Mantener estado local
    if (numerosMarcados.has(numero)) {
        numerosMarcados.delete(numero);
    } else {
        numerosMarcados.add(numero);
    }
}

// =======================
// Utilidades futuras
// =======================

export function getNumerosMarcados() {
    return Array.from(numerosMarcados);
}

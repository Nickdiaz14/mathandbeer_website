let n;
let cells;
let cond_ini;
let cell_size;
let guess_row = 0;
let solved = false;
let timerInterval = null;
let validateTimeout = null;
let centisecondsElapsed = 0;

const timer = document.getElementById('timer');
const title = document.getElementById('title');
const subtitle = document.getElementById('subtitle');
const back = document.getElementById('back');
const recharge = document.getElementById('recharge');
const overlay = document.getElementById('countdown-overlay');
const inputsTable = document.getElementById('inputs');
const matrix = document.getElementById('matrix');

document.addEventListener('DOMContentLoaded', function () {
    n = Number(document.body.dataset.n)
    back.addEventListener('click', () => {
        window.history.back();
    });

    recharge.addEventListener('click', () => {
        window.location.reload();
    });

    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            window.location.reload();
        }
    });
    cell_size = n === 6 ? 'z-6' : n === 8 ? 'z-8' : 'z-10';
    const mtr = document.createElement('tr')
    for (let j = 0; j < n; j++) {
        const mtd = document.createElement('td')
        mtd.classList.add('grey')
        mtd.classList.add(cell_size)
        mtd.id = `cell-0-${j}`;
        mtr.appendChild(mtd)
    }
    matrix.appendChild(mtr)

    matrix.classList.add('matrix')
    cells = document.querySelectorAll('td');

    inputsTable.innerHTML = ''; // Limpiar contenido de la tabla de inputs existente
    let values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '-', '*', '/', '='];
    for (let i = 0; i < 3; i++) {
        const row = document.createElement('tr');
        for (let j = 0; j < 6; j++) {
            const cell = document.createElement('td');
            cell.className = 'grey'; // Clase inicial para todas las celdas
            if (j === 5) {
                if (i === 0) {
                    cell.innerHTML = '<i class="fa-solid fa-delete-left"></i>';
                    cell.onclick = () => send("Borrar");
                    cell.id = 'inputs_borrar'
                } else if (i === 1) {
                    cell.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
                    cell.onclick = () => send("Eliminar");
                    cell.id = 'inputs_eliminar'
                } else {
                    cell.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i>';
                    cell.onclick = () => send("Enviar");
                    cell.id = 'inputs_enviar'
                }
            }
            else {
                cell.innerText = values[i * 5 + j];
                cell.id = `inputs_${values[i * 5 + j]}`
                cell.onclick = () => keyboard(cell.innerText);
            }
            row.appendChild(cell);
        }
        inputsTable.appendChild(row);
    }
    startGame()
})

function updateTimerDisplay() {
    const minutes = Math.floor(centisecondsElapsed / 6000).toString().padStart(2, '0');
    const seconds = Math.floor((centisecondsElapsed % 6000) / 100).toString().padStart(2, '0');
    const milliseconds = (centisecondsElapsed % 100).toString().padStart(2, '0');
    timer.textContent = `${minutes}:${seconds}.${milliseconds}`;
}

function start_timer() {
    if (timerInterval !== null) return;

    centisecondsElapsed = 0;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        centisecondsElapsed++; // Incrementar tiempo
        updateTimerDisplay();
    }, 10); // Actualizar cada 10 ms (centésima de segundo)
}

function stop_timer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);  // ← Detiene el cronómetro
        timerInterval = null;          // ← Limpia el ID para poder reiniciarlo
    }
}

function send(action) {
    if (action == 'Eliminar') {
        for (let j = 0; j < n; j++) {
            cell = document.getElementById(`cell-${guess_row}-${j}`)
            cell.innerText = '';
        }
    }
    else if (action == 'Borrar') {
        for (let j = n - 1; j > -1; j--) {
            cell = document.getElementById(`cell-${guess_row}-${j}`)
            if (cell.innerText !== '') {
                cell.innerText = '';
                break;
            }
        }
    }
    else if (action == 'Enviar') {
        expression = '';
        for (let j = 0; j < n; j++) {
            cell = document.getElementById(`cell-${guess_row}-${j}`)
            if (cell.innerText === '') {
                subtitle.innerText = '¡Escribe una expresión válida!';
                return;
            }
            expression += cell.innerText;
        }
        valid = validate_guess(expression);
        set_colors(valid);
        if (valid) {
            stop_timer();
            setTimeout(() => sendRecord(), 200);
        }
    }
}

function keyboard(value) {
    subtitle.innerText = '¡Adivina la ecuación!';
    if (solved) return;
    for (let j = 0; j < n; j++) {
        cell = document.getElementById(`cell-${guess_row}-${j}`)
        if (cell.innerText === '') {
            cell.innerText = value;
            break;
        }
    }
}

function startGame() {
    const isDaily = new URLSearchParams(window.location.search).get('daily') === 'true';
    const userId = localStorage.getItem('userId');
    const fetchUrl = isDaily ? `/api/daily?userid=${userId}` : '/nerdle/play';
    const fetchBody = isDaily ? null : JSON.stringify({ n: n });
    const fetchMethod = isDaily ? 'GET' : 'POST';

    if (isDaily) {
        const rechargeBtn = document.getElementById('recharge');
        if (rechargeBtn) rechargeBtn.style.display = 'none';
    }

    fetch(fetchUrl, {
        method: fetchMethod,
        headers: { 'Content-Type': 'application/json' },
        body: fetchBody
    })
        .then(response => response.json())
        .then(data => {
            cond_ini = isDaily ? data.board_data : data.equalities;
            let cuenta = 3;
            overlay.textContent = cuenta;

            const contador = setInterval(() => {
                cuenta--;
                if (cuenta > 0) {
                    overlay.textContent = cuenta;
                } else {
                    clearInterval(contador);
                    overlay.classList.add('fade-out');
                    setTimeout(start_timer, 200);
                }
            }, 800);
        })
}

function validate_guess(expression) {
    const parts = expression.split('=');
    if (parts.length !== 2) {
        subtitle.innerText = '¡Escribe una expresión válida!';
        return false;
    }
    const left_part = parts[0];
    const right_part = parts[1];
    if (!left_part.includes('+') && !left_part.includes('-') && !left_part.includes('*') && !left_part.includes('/')) {
        subtitle.innerText = '¡Escribe una expresión válida!';
        return false;
    }
    try {
        const left_value = eval(left_part);
        const right_value = eval(right_part);
        if (left_value !== right_value) {
            subtitle.innerText = '¡La ecuación no es válida!';
            return false;
        }
    } catch (error) {
        subtitle.innerText = '¡La ecuación no es válida!';
        return false;
    }
    if (cond_ini === expression) {
        subtitle.innerText = '¡Correcto!';
        return true;
    }
    subtitle.innerText = '¡Adivina la ecuación!';
    guess_row++;
    const mtr = document.createElement('tr')
    for (let j = 0; j < n; j++) {
        const mtd = document.createElement('td')
        mtd.classList.add('grey')
        mtd.classList.add(cell_size)
        mtd.id = `cell-${guess_row}-${j}`;
        mtr.appendChild(mtd)
    }
    matrix.appendChild(mtr)

    return false;
}

function set_colors(correct) {
    let row = !correct ? guess_row - 1 : guess_row;

    // Conteo de caracteres disponibles en la solución
    const solutionCounts = {};
    for (const char of cond_ini) {
        solutionCounts[char] = (solutionCounts[char] || 0) + 1;
    }

    // Primera pasada: marcar posiciones exactas y descontar del conteo
    for (let j = 0; j < n; j++) {
        const cell = document.getElementById(`cell-${row}-${j}`);
        if (cell.innerText === cond_ini[j]) {
            cell.classList.add('correct_place');
            solutionCounts[cell.innerText]--;
        }
    }

    // Segunda pasada: marcar caracteres presentes pero en posición incorrecta
    for (let j = 0; j < n; j++) {
        const cell = document.getElementById(`cell-${row}-${j}`);
        if (!cell.classList.contains('correct_place')) {
            const char = cell.innerText;
            if (cond_ini.includes(char) && (solutionCounts[char] || 0) > 0) {
                cell.classList.add('correct_character');
                solutionCounts[char]--;
            } else {
                cell.classList.add('nowhere');
            }
        }
        const keyboard_cell = document.getElementById(`inputs_${cell.innerText}`);
        if (cell.classList.contains('correct_place')) {
            // correct_place siempre gana — quitar clases inferiores
            keyboard_cell.classList.remove('correct_character', 'nowhere');
            keyboard_cell.classList.add('correct_place');
        } else if (cell.classList.contains('correct_character') && !keyboard_cell.classList.contains('correct_place')) {
            // correct_character solo si no hay ya un correct_place
            keyboard_cell.classList.remove('nowhere');
            keyboard_cell.classList.add('correct_character');
        } else if (!keyboard_cell.classList.contains('correct_place') && !keyboard_cell.classList.contains('correct_character')) {
            // nowhere solo si no hay ninguna clase mejor
            keyboard_cell.classList.add('nowhere');
        }
    }
}

function sendRecord() {
    const isDaily = new URLSearchParams(window.location.search).get('daily') === 'true';
    const submitUrl = isDaily ? '/api/daily/submit' : '/leaderboard/submit';
    const recordVal = 100000.0 / (((centisecondsElapsed / 100) + 1) * (guess_row + 1));
    console.log(recordVal)

    fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            game: `NRD${n}`,
            record: recordVal,
            userid: localStorage.getItem('userId')
        })
    })
        .then(response => response.json())
        .then(data => {
            if (isDaily) {
                window.location.href = '/daily';
            } else {
                let game_name = n == 6 ? 'Mini-Nerdle' : n == 8 ? 'Nerdle' : 'Maxi-Nerdle';
                window.location.href = `/leaderboard?game=NRD${n}&name=${game_name}&better=${data.better}&type=2&record=${centisecondsElapsed}`
            }
        })
}
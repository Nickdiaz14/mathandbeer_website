let n;
let cells;
let solved = false;
let timerInterval = null;
let validateTimeout = null;
let centisecondsElapsed = 0;
let game_matrix = Array.from({ length: n }, () => Array(n).fill(-1));

const messages = [
    'Mira esto',
    'Ojo aquí',
    'Verifica',
    'Revísalo',
    'Pilas aquí',
    'Algo raro',
    'Detalle aquí',
    'Corrige esto',
    'Valida esto',
    'Revisa bien',
    'Mira bien',
    'Ojo con eso'
]

const timer = document.getElementById('timer');
const title = document.getElementById('title');
const back = document.getElementById('back');
const overlay = document.getElementById('countdown-overlay');

document.addEventListener('DOMContentLoaded', function () {
    n = Number(document.body.dataset.n)
    setupGameControls();
    const cell_size = n === 4 ? 'grey' : n === 6 ? 'z-6' : n === 8 ? 'z-8' : 'z-10';
    const matrix = document.getElementById('matrix');
    for (let i = 0; i < n; i++) {
        const mtr = document.createElement('tr')
        for (let j = 0; j < n; j++) {
            const mtd = document.createElement('td')
            mtd.classList.add('grey')
            mtd.classList.add(cell_size)
            mtd.id = `cell-${i}-${j}`;
            mtd.addEventListener('click', () => toggle_color(i, j, mtd))
            mtr.appendChild(mtd)
        }
        matrix.appendChild(mtr)
    }
    matrix.classList.add('matrix')
    cells = document.querySelectorAll('td');
    startGame()
})

function start_timer() {
    if (timerInterval !== null) return;

    centisecondsElapsed = 0;
    updateTimerDisplay(centisecondsElapsed, timer);

    timerInterval = setInterval(() => {
        centisecondsElapsed++;
        updateTimerDisplay(centisecondsElapsed, timer);
    }, 10);
}

function stop_timer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);  // ← Detiene el cronómetro
        timerInterval = null;          // ← Limpia el ID para poder reiniciarlo
    }
}

function toggle_color(row, col, td) {
    if (game_matrix[row][col] === -1) {
        game_matrix[row][col] = 0;
        td.classList.remove('grey');
        td.classList.add('red');
    } else if (game_matrix[row][col] === 0) {
        game_matrix[row][col] = 1;
        td.classList.remove('red');
        td.classList.add('blue');
    } else {
        game_matrix[row][col] = -1;
        td.classList.remove('blue');
        td.classList.add('grey');
    }

    if (validateTimeout) clearTimeout(validateTimeout);

    validateTimeout = setTimeout(() => valid_solution(), 200);

}

function startGame() {
    const isDaily = isDailyMode();
    const userId = localStorage.getItem('userId');
    const fetchUrl = isDaily ? `/api/daily?userid=${userId}` : '/0h_h1/play';
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
            const cond_ini = isDaily ? data.board_data : data.matrix;
            game_matrix = cond_ini.map(row => [...row]);

            for (let i = 0; i < game_matrix.length; i++) {
                for (let j = 0; j < game_matrix[i].length; j++) {
                    const cell = document.getElementById(`cell-${i}-${j}`);
                    cell.classList.remove('grey')
                    const color = game_matrix[i][j] === 0 ? ['red', 'blocked'] :
                        game_matrix[i][j] === 1 ? ['blue', 'blocked'] :
                            ['grey'];
                    for (let k = 0; k < color.length; k++) {
                        cell.classList.add(color[k])
                    }

                }
            }
            showAnimatedCountdown(overlay, "Llena el tablero con 🔴 y 🔵 sin repetir filas ni columnas", start_timer);
        })
}

function valid_solution() {
    let num = Math.floor(Math.random() * messages.length)
    title.textContent = '0h-h1';
    cells.forEach(cell => cell.classList.remove('cell_alert'))

    if (solved || game_matrix.some(row => row.includes(-1))) return;
    let game_matrix_t = game_matrix[0].map((_, col) =>
        game_matrix.map(row => row[col])
    );

    // Validar tres consecutivos
    for (let r = 0; r < n; r++) {

        const row = game_matrix[r];
        const col = game_matrix_t[r];

        let row_prev = null, row_count = 0;
        let col_prev = null, col_count = 0;

        for (let c = 0; c < n; c++) {

            if (row_prev === row[c]) {
                row_count++;
                if (row_count === 3) {
                    title.textContent = messages[num];
                    for (let consec = 0; consec < 3; consec++) {
                        const mtd = document.getElementById(`cell-${r}-${c - consec}`)
                        mtd.classList.add('cell_alert')
                    }
                    return;
                }
            } else {
                row_prev = row[c];
                row_count = 1;
            }

            if (col_prev === col[c]) {
                col_count++;
                if (col_count === 3) {
                    title.textContent = messages[num];
                    for (let consec = 0; consec < 3; consec++) {
                        const mtd = document.getElementById(`cell-${c - consec}-${r}`)
                        mtd.classList.add('cell_alert')
                    }
                    return;
                }
            } else {
                col_prev = col[c];
                col_count = 1;
            }
        }

        // Validar cantidad de 0s y 1s
        let row_sum = row.reduce((a, b) => a + b, 0);
        let col_sum = col.reduce((a, b) => a + b, 0);

        if (row_sum !== n / 2) {
            title.textContent = messages[num];
            for (let consec = 0; consec < n; consec++) {
                const mtd = document.getElementById(`cell-${r}-${consec}`)
                mtd.classList.add('cell_alert')
            }
            return;
        }
        if (col_sum !== n / 2) {
            title.textContent = messages[num];
            for (let consec = 0; consec < n; consec++) {
                const mtd = document.getElementById(`cell-${consec}-${r}`)
                mtd.classList.add('cell_alert')
            }
            return;
        }
    }

    // Revisar unicidad de filas y columnas
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (game_matrix[i].every((v, k) => v === game_matrix[j][k])) {
                title.textContent = messages[num];
                for (let consec = 0; consec < n; consec++) {
                    const mtd_1 = document.getElementById(`cell-${i}-${consec}`)
                    const mtd_2 = document.getElementById(`cell-${j}-${consec}`)
                    mtd_1.classList.add('cell_alert')
                    mtd_2.classList.add('cell_alert')
                }
                return;
            }
        }
    }

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (game_matrix_t[i].every((v, k) => v === game_matrix_t[j][k])) {
                title.textContent = messages[num];
                for (let consec = 0; consec < n; consec++) {
                    const mtd_1 = document.getElementById(`cell-${consec}-${i}`)
                    const mtd_2 = document.getElementById(`cell-${consec}-${j}`)
                    mtd_1.classList.add('cell_alert')
                    mtd_2.classList.add('cell_alert')
                }
                return;
            }
        }
    }

    solved = true;
    title.textContent = '¡Felicidades!';
    stop_timer();
    sendRecord();
    return;
}

function sendRecord() {
    const isDaily = isDailyMode();
    const submitUrl = isDaily ? '/api/daily/submit' : '/leaderboard/submit';

    fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            game: `T${n}`,
            record: centisecondsElapsed,
            userid: localStorage.getItem('userId')
        })
    })
        .then(response => response.json())
        .then(data => {
            if (isDaily) {
                window.location.href = '/daily';
            } else {
                window.location.href = `/leaderboard?game=T${n}&name=0h-h1 - ${n}&better=${data.better}&type=1&record=${centisecondsElapsed}`
            }
        })
}
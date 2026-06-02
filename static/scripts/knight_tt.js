let n = 8;
let cells;
let score = 0;
let timerInterval = null;
let centisecondsRemaining = 4500;
let game_matrix = Array.from({ length: n }, () => Array(n).fill(0));
let knightRow = 0;
let knightCol = 0;
const MIN_DIST = 5;

const CELL_LIFETIME = 5000;
const SPAWN_INTERVAL = 4000;

const cellTimers = {};
const cellCountdowns = {};
let cellSpawnInterval = null;

const timer = document.getElementById('timer');
const scoreDisplay = document.getElementById('score');
const overlay = document.getElementById('countdown-overlay');

document.addEventListener('DOMContentLoaded', function () {
    setupGameControls();
    const matrix = document.getElementById('matrix');
    for (let i = 0; i < n; i++) {
        const mtr = document.createElement('tr');
        for (let j = 0; j < n; j++) {
            const mtd = document.createElement('td');
            mtd.classList.add('grey', 'z-8');
            mtd.id = `cell-${i}-${j}`;
            mtd.addEventListener('click', () => toggle_color(i, j));
            mtr.appendChild(mtd);
        }
        matrix.appendChild(mtr);
    }
    matrix.classList.add('matrix');
    cells = document.querySelectorAll('td');
    startGame();
});

function start_timer() {
    if (timerInterval !== null) return;
    centisecondsRemaining = 4500;
    updateTimerDisplay(centisecondsRemaining, timer);

    timerInterval = setInterval(() => {
        centisecondsRemaining--;
        updateTimerDisplay(centisecondsRemaining, timer);
        if (centisecondsRemaining <= 0) endGame();
    }, 10);
}

function stop_timer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function startCellSpawner() {
    stopCellSpawner();
    cellSpawnInterval = setInterval(() => spawnRedCell(), SPAWN_INTERVAL);
}

function stopCellSpawner() {
    if (cellSpawnInterval !== null) {
        clearInterval(cellSpawnInterval);
        cellSpawnInterval = null;
    }
}

function removeCellTimer(key) {
    if (cellCountdowns[key]) {
        clearInterval(cellCountdowns[key]);
        delete cellCountdowns[key];
    }
    if (cellTimers[key]) {
        clearTimeout(cellTimers[key]);
        delete cellTimers[key];
    }
}

function expireRedCell(r, c) {
    const key = `${r}-${c}`;
    removeCellTimer(key);
    if (game_matrix[r][c] === 1) {
        game_matrix[r][c] = 0;
        const cell = document.getElementById(`cell-${r}-${c}`);
        const baseColor = (r + c) % 2 === 0 ? 'white' : 'black';
        cell.classList.remove('red');
        cell.classList.add(baseColor);
        const span = cell.querySelector('.cell-timer');
        if (span) span.remove();
    }
}

function toggle_color(row, col) {
    document.querySelector('.horse').classList.remove('horse');
    const new_horse = document.getElementById(`cell-${row}-${col}`);
    new_horse.classList.add('horse');
    knightRow = row;
    knightCol = col;

    if (game_matrix[row][col] === 1) {
        const key = `${row}-${col}`;
        removeCellTimer(key);
        const span = new_horse.querySelector('.cell-timer');
        if (span) span.remove();

        game_matrix[row][col] = 0;
        score++;
        scoreDisplay.textContent = `Celdas: ${score}`;
        centisecondsRemaining += Math.floor(250 * Math.pow(0.8, score));
        const baseColor = (row + col) % 2 === 0 ? 'white' : 'black';
        new_horse.classList.remove('red');
        new_horse.classList.add(baseColor);
        spawnRedCell();
    }

    updateValidSpots(row, col);
}

function updateValidSpots(i, j) {
    cells.forEach(cell => cell.classList.add('locked'));
    const valid = [
        [i + 2, j + 1], [i + 2, j - 1],
        [i - 2, j + 1], [i - 2, j - 1],
        [i + 1, j + 2], [i + 1, j - 2],
        [i - 1, j + 2], [i - 1, j - 2],
    ];
    valid.forEach(([x, y]) => {
        if (x >= 0 && x < n && y >= 0 && y < n) {
            document.getElementById(`cell-${x}-${y}`).classList.remove('locked');
        }
    });
}

function spawnRedCell() {
    const candidates = [];
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (game_matrix[i][j] === 0 && !(i === knightRow && j === knightCol)) {
                if (Math.abs(i - knightRow) + Math.abs(j - knightCol) >= MIN_DIST) {
                    candidates.push([i, j]);
                }
            }
        }
    }

    let target;
    if (candidates.length > 0) {
        target = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
        const fallback = [];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (game_matrix[i][j] === 0 && !(i === knightRow && j === knightCol)) {
                    fallback.push([i, j]);
                }
            }
        }
        if (fallback.length === 0) return;
        target = fallback[Math.floor(Math.random() * fallback.length)];
    }

    const [r, c] = target;
    game_matrix[r][c] = 1;
    const cell = document.getElementById(`cell-${r}-${c}`);
    const baseColor = (r + c) % 2 === 0 ? 'white' : 'black';
    cell.classList.remove(baseColor);
    cell.classList.add('red');

    const span = document.createElement('span');
    span.className = 'cell-timer';
    span.textContent = Math.ceil(CELL_LIFETIME / 1000);
    cell.appendChild(span);

    const key = `${r}-${c}`;
    let secondsLeft = Math.ceil(CELL_LIFETIME / 1000);
    cellCountdowns[key] = setInterval(() => {
        secondsLeft--;
        if (span.parentNode) span.textContent = secondsLeft;
    }, 1000);

    cellTimers[key] = setTimeout(() => expireRedCell(r, c), CELL_LIFETIME);
}

async function startGame() {
    knightRow = Math.floor(Math.random() * n);
    knightCol = Math.floor(Math.random() * n);

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const cell = document.getElementById(`cell-${i}-${j}`);
            cell.classList.add((i + j) % 2 === 0 ? 'white' : 'black');
            cell.classList.remove('grey');
        }
    }

    document.getElementById(`cell-${knightRow}-${knightCol}`).classList.add('horse');
    updateValidSpots(knightRow, knightCol);

    showAnimatedCountdown(overlay, "Captura tantas celdas rojas como puedas antes de que se acabe el tiempo ♞", () => {
        spawnRedCell();
        start_timer();
        startCellSpawner();
    });
}

function endGame() {
    stop_timer();
    stopCellSpawner();
    Object.keys(cellTimers).forEach(key => clearTimeout(cellTimers[key]));
    Object.keys(cellCountdowns).forEach(key => clearInterval(cellCountdowns[key]));
    cells.forEach(cell => cell.classList.add('locked'));

    fetch('/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            game: 'TKnightTT',
            record: score,
            userid: localStorage.getItem('userId')
        })
    })
        .then(response => response.json())
        .then(data => {
            window.location.href = `/leaderboard?game=TKnightTT&name=Salto+Real+Contrarreloj&better=${data.better}&type=3&record=${score}`;
        });
}

let n;
let cages = [];
let boardData = null;
let selectedCell = null;
let timerInterval = null;
let centisecondsElapsed = 0;
let isGameFinished = false;

const timerEl = document.getElementById('timer');
const gridEl = document.getElementById('kenken-grid');
const overlayEl = document.getElementById('countdown-overlay');

document.addEventListener('DOMContentLoaded', function () {
    n = Number(document.body.dataset.n || 4);
    setupGameControls();
    
    // Vincular teclado en pantalla
    document.querySelectorAll('.keypad-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const value = btn.getAttribute('data-value');
            handleInput(value);
        });
    });

    // Vincular teclado físico
    document.addEventListener('keydown', (e) => {
        if (isGameFinished) return;
        if (e.key >= '1' && e.key <= n.toString()) {
            handleInput(e.key);
        } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
            handleInput('clear');
        }
    });

    startGame();
});

async function startGame() {
    const isDaily = isDailyMode();
    const userId = localStorage.getItem('userId');

    if (isDaily) {
        const rechargeBtn = document.getElementById('recharge');
        if (rechargeBtn) rechargeBtn.style.display = 'none';
        try {
            const response = await fetch(`/api/daily?userid=${userId}`);
            const data = await response.json();
            boardData = data.board_data;
        } catch (error) {
            console.error("Error fetching daily board:", error);
            showToast("Error al cargar el reto diario", "error");
            return;
        }
    } else {
        try {
            const response = await fetch('/kenken/play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ n: n })
            });
            boardData = await response.json();
        } catch (error) {
            console.error("Error fetching board:", error);
            showToast("Error al conectar con el servidor", "error");
            return;
        }
    }

    cages = boardData.cages;
    renderGrid();
    showAnimatedCountdown(overlayEl, "Llena la cuadrícula respetando las restricciones aritméticas y sin repetir números en filas/columnas.", startTimer);
}

function renderGrid() {
    gridEl.innerHTML = '';
    
    // Crear mapeo de celda a jaula (para saber a qué jaula pertenece cada coordenada)
    const cellToCage = {};
    cages.forEach(cage => {
        cage.cells.forEach(cell => {
            const [r, c] = cell;
            cellToCage[`${r}-${c}`] = cage;
        });
    });

    // Dibujar celdas
    for (let r = 0; r < n; r++) {
        const rowTr = document.createElement('tr');
        for (let c = 0; c < n; c++) {
            const cellTd = document.createElement('td');
            cellTd.id = `cell-${r}-${c}`;
            cellTd.setAttribute('data-row', r);
            cellTd.setAttribute('data-col', c);
            
            // Añadir evento de selección
            cellTd.addEventListener('click', () => selectCell(cellTd));
            
            // Dibujar bordes de jaulas (gruesos en los límites de cada jaula)
            const currentCage = cellToCage[`${r}-${c}`];
            const cageId = currentCage.id;
            
            // Borde superior
            if (r === 0 || cellToCage[`${r-1}-${c}`].id !== cageId) {
                cellTd.classList.add('border-top-thick');
            }
            // Borde inferior
            if (r === n - 1 || cellToCage[`${r+1}-${c}`].id !== cageId) {
                cellTd.classList.add('border-bottom-thick');
            }
            // Borde izquierdo
            if (c === 0 || cellToCage[`${r}-${c-1}`].id !== cageId) {
                cellTd.classList.add('border-left-thick');
            }
            // Borde derecho
            if (c === n - 1 || cellToCage[`${r}-${c+1}`].id !== cageId) {
                cellTd.classList.add('border-right-thick');
            }

            rowTr.appendChild(cellTd);
        }
        gridEl.appendChild(rowTr);
    }

    // Colocar etiquetas de jaula (ej. 12x, 5+) en la celda más arriba-izquierda de cada jaula
    cages.forEach(cage => {
        // Encontrar la celda más arriba-izquierda
        let topLeftCell = cage.cells[0];
        cage.cells.forEach(cell => {
            if (cell[0] < topLeftCell[0] || (cell[0] === topLeftCell[0] && cell[1] < topLeftCell[1])) {
                topLeftCell = cell;
            }
        });
        
        const td = document.getElementById(`cell-${topLeftCell[0]}-${topLeftCell[1]}`);
        if (td) {
            const labelSpan = document.createElement('span');
            labelSpan.className = 'cage-label';
            labelSpan.textContent = `${cage.target}${cage.op}`;
            td.appendChild(labelSpan);
        }
    });
}

function selectCell(td) {
    if (isGameFinished) return;
    
    // Reproducir sonido de clic si el toggle de audio está activo
    playClickSound();

    if (selectedCell) {
        selectedCell.classList.remove('selected');
    }
    
    selectedCell = td;
    selectedCell.classList.add('selected');
}

function handleInput(value) {
    if (!selectedCell || isGameFinished) return;
    
    // Obtener elemento de texto o valor numérico
    // Nota: Como la celda contiene una etiqueta .cage-label, limpiaremos el texto de fondo manteniendo el span de la etiqueta
    let valText = selectedCell.querySelector('.cell-value');
    if (!valText) {
        valText = document.createElement('span');
        valText.className = 'cell-value';
        selectedCell.appendChild(valText);
    }

    if (value === 'clear') {
        valText.textContent = '';
    } else {
        valText.textContent = value;
    }
    
    // Remover colores de conflicto antes de re-validar
    clearConflicts();
    
    // Validar el tablero completo
    checkBoardState();
}

function clearConflicts() {
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const td = document.getElementById(`cell-${r}-${c}`);
            if (td) td.classList.remove('conflict');
        }
    }
}

function getCellValue(r, c) {
    const td = document.getElementById(`cell-${r}-${c}`);
    if (!td) return 0;
    const valSpan = td.querySelector('.cell-value');
    return valSpan && valSpan.textContent ? Number(valSpan.textContent) : 0;
}

function checkBoardState() {
    let isFull = true;
    
    // 1. Verificar si el tablero está lleno
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (getCellValue(r, c) === 0) {
                isFull = false;
            }
        }
    }
    
    if (!isFull) return;

    // 2. Si está lleno, validar reglas de filas, columnas y jaulas
    let isValid = true;
    
    // Validar filas
    for (let r = 0; r < n; r++) {
        const seen = new Set();
        for (let c = 0; c < n; c++) {
            const val = getCellValue(r, c);
            if (seen.has(val)) {
                isValid = false;
                // Marcar fila como conflictiva
                for (let col = 0; col < n; col++) {
                    document.getElementById(`cell-${r}-${col}`).classList.add('conflict');
                }
            }
            seen.add(val);
        }
    }
    
    // Validar columnas
    for (let c = 0; c < n; c++) {
        const seen = new Set();
        for (let r = 0; r < n; r++) {
            const val = getCellValue(r, c);
            if (seen.has(val)) {
                isValid = false;
                // Marcar columna como conflictiva
                for (let row = 0; row < n; row++) {
                    document.getElementById(`cell-${row}-${c}`).classList.add('conflict');
                }
            }
            seen.add(val);
        }
    }

    // Validar operaciones matemáticas de jaulas (cages)
    cages.forEach(cage => {
        const vals = cage.cells.map(cell => getCellValue(cell[0], cell[1]));
        let cageOk = false;
        
        if (cage.op === '') {
            cageOk = (vals[0] === cage.target);
        } else if (cage.op === '+') {
            const sum = vals.reduce((acc, curr) => acc + curr, 0);
            cageOk = (sum === cage.target);
        } else if (cage.op === '*') {
            const prod = vals.reduce((acc, curr) => acc * curr, 1);
            cageOk = (prod === cage.target);
        } else if (cage.op === '-') {
            // Solo permitido para tamaño 2
            cageOk = (Math.abs(vals[0] - vals[1]) === cage.target);
        } else if (cage.op === '/') {
            // Solo permitido para tamaño 2
            const maxVal = Math.max(vals[0], vals[1]);
            const minVal = Math.min(vals[0], vals[1]);
            cageOk = (minVal !== 0 && (maxVal / minVal) === cage.target);
        }
        
        if (!cageOk) {
            isValid = false;
            // Marcar celdas de la jaula como conflictivas
            cage.cells.forEach(cell => {
                document.getElementById(`cell-${cell[0]}-${cell[1]}`).classList.add('conflict');
            });
        }
    });

    if (isValid) {
        // Victoria
        isGameFinished = true;
        if (selectedCell) selectedCell.classList.remove('selected');
        playWinSound();
        sendRecord();
    } else {
        // Feedback visual de error
        gridEl.classList.add('shake-grid');
        setTimeout(() => {
            gridEl.classList.remove('shake-grid');
        }, 400);
        playErrorSound();
    }
}

function startTimer() {
    if (timerInterval !== null) return;
    centisecondsElapsed = 0;
    updateTimerDisplay(centisecondsElapsed, timerEl);

    timerInterval = setInterval(() => {
        centisecondsElapsed++;
        updateTimerDisplay(centisecondsElapsed, timerEl);
    }, 10);
}

function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function sendRecord() {
    stopTimer();
    const isDaily = isDailyMode();
    const gameName = `KenKen ${n}×${n}`;
    const boardCode = `KK${n}`;

    const submitUrl = isDaily ? '/api/daily/submit' : '/leaderboard/submit';

    fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            game: boardCode,
            record: centisecondsElapsed,
            userid: localStorage.getItem('userId')
        })
    })
        .then(response => response.json())
        .then(data => {
            if (isDaily) {
                // Si completó racha o consumió escudo, mostrar información
                if (data.consumed_freeze) {
                    showToast("¡Racha salvada con un Escudo de Racha! 🍺", "success");
                }
                if (data.earned_freeze) {
                    showToast("¡Ganaste un nuevo Escudo de Racha! 🏆", "success");
                }
                setTimeout(() => {
                    window.location.href = '/daily';
                }, data.consumed_freeze || data.earned_freeze ? 2000 : 1000);
            } else {
                window.location.href = `/leaderboard?game=${boardCode}&name=${gameName}&better=${data.better}&type=1&record=${centisecondsElapsed}`;
            }
        })
        .catch(err => {
            console.error("Error submitting score:", err);
            showToast("Error al guardar puntuación", "error");
        });
}

// ─── SÍNTESIS DE AUDIO (Web Audio API) ───────────────────────────
// Generación rápida de tonos para un feedback retro y liviano

function getAudioContext() {
    if (localStorage.getItem('sfx_enabled') === 'false') return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    return AudioContextClass ? new AudioContextClass() : null;
}

function playClickSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
}

function playErrorSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.21);
}

function playWinSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Una bonita arpegio ascendente tipo victoria de 8-bits
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
        setTimeout(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.26);
        }, index * 100);
    });
}

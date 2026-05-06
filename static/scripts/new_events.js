// =============================================
// new_events.js — Próximas charlas + RSVP
// Math & Beer Games
// =============================================

const new_events_part = document.getElementById('new_events');
const events_list = document.getElementById('events_list');
const _userId = localStorage.getItem('userId');

if (new_events_part) {
    setTimeout(() => {
        new_events_part.classList.add('pop_up')
        setTimeout(() => {
            new_events_part.classList.remove('pop_up')
        }, 1000);
    }, 200);

    new_events_part.addEventListener('click', () => {
        events_list.classList.toggle('no_show')
        events_list.classList.toggle('displayColumn')
    });
}

// Lógica principal al cargar la página
document.addEventListener('DOMContentLoaded', function () {
    const eventosString = document.body.dataset.proxima;

    if (eventosString) {
        try {
            const eventos = JSON.parse(eventosString);
            construirTarjetas(eventos);
            iniciarCuentasAtras(eventos);
            iniciarRSVP(eventos);
            iniciarQA(eventos);
        } catch (error) {
            console.error("Error al procesar los eventos:", error);
        }
    }
});

// Función para inyectar el HTML dinámicamente
function construirTarjetas(eventos) {
    const contenedor = document.getElementById('contenedor-dinamico');
    if (!contenedor) return;

    let htmlTarjetas = '';

    eventos.forEach((evento, index) => {
        htmlTarjetas += `
        <div class="upcoming-card myBg myBorder rounded-4 shadow-sm p-3 mt-3" data-event-id="${evento.id}">
            <p class="subtitle fs-5 mb-1">${evento.city}</p>
            <p class="title fs-5 mb-2">${evento.title}</p>
            <div class="upcoming-countdown">
                <i class="fa-solid fa-clock me-1" style="color:var(--accent-beer)"></i>
                <span id="restante-${index}" class="upcoming-time">--d --h --m --s</span>
            </div>
            <button class="rsvp-btn" data-event-id="${evento.id}" data-attending="0">
                <span>🍻</span>
                <span class="rsvp-count">0</span>
                Asistiré
            </button>
            <!-- Calendar buttons -->
            <div class="calendar-btns">
                <a href="${googleCalendarUrl(evento)}" target="_blank" rel="noopener" class="calendar-btn">
                    <i class="fa-solid fa-calendar-plus me-1"></i>Google Calendar
                </a>
            </div>
            <!-- Q&A -->
            <div class="qa-section">
                <p class="qa-title"><i class="fa-solid fa-microphone me-1"></i>Pregúntale al ponente</p>
                <div class="qa-list" data-event-id="${evento.id}"></div>
                <div class="qa-input-row">
                    <textarea class="qa-input" rows="1" placeholder="Escribe tu pregunta..." data-event-id="${evento.id}"></textarea>
                    <button class="qa-send-btn" data-event-id="${evento.id}"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
                <p class="blog-login-hint">Solo usuarios con <a href="/register" class="blog-nick-link">Nickname</a> pueden preguntar.</p>
            </div>
        </div>
        `;
    });

    contenedor.innerHTML = htmlTarjetas;
}

// RSVP: cargar estado y escuchar clics
function iniciarRSVP(eventos) {
    document.querySelectorAll('.rsvp-btn').forEach(btn => {
        const eventId = parseInt(btn.dataset.eventId);
        // Cargar estado
        loadRSVP(eventId, btn);
        // Toggle
        btn.addEventListener('click', () => toggleRSVP(eventId, btn));
    });
}

async function loadRSVP(eventId, btn) {
    try {
        const url = _userId ? `/api/rsvp/${eventId}?userid=${_userId}` : `/api/rsvp/${eventId}`;
        const res = await fetch(url);
        const data = await res.json();
        btn.querySelector('.rsvp-count').textContent = data.total;
        btn.dataset.attending = data.attending ? '1' : '0';
        btn.classList.toggle('rsvp-active', data.attending);
    } catch { /* silencioso */ }
}

async function toggleRSVP(eventId, btn) {
    if (!_userId) return;
    try {
        const res = await fetch('/api/rsvp/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userid: _userId, event_id: eventId })
        });
        const data = await res.json();
        if (data.success) {
            btn.querySelector('.rsvp-count').textContent = data.total;
            btn.dataset.attending = data.attending ? '1' : '0';
            btn.classList.toggle('rsvp-active', data.attending);
            // Pop animation
            btn.style.transform = 'scale(1.1)';
            setTimeout(() => btn.style.transform = '', 200);
        }
    } catch { /* silencioso */ }
}

// Q&A para los eventos futuros
function iniciarQA(eventos) {
    document.querySelectorAll('.qa-section').forEach(section => {
        const qaList = section.querySelector('.qa-list');
        if (!qaList) return;
        const eventId = parseInt(qaList.dataset.eventId);
        const qaTextarea = section.querySelector('.qa-input');
        const qaSendBtn = section.querySelector('.qa-send-btn');

        if (typeof loadQuestions === 'function') {
            loadQuestions(eventId, qaList);
        }

        if (qaSendBtn && qaTextarea && qaList) {
            qaSendBtn.addEventListener('click', () => {
                if (typeof submitQuestion === 'function') {
                    submitQuestion(eventId, qaTextarea, qaList);
                }
            });
            qaTextarea.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (typeof submitQuestion === 'function') {
                        submitQuestion(eventId, qaTextarea, qaList);
                    }
                }
            });
        }
    });
}

// ─── Calendar helpers ─────────────────────────────────────────
function googleCalendarUrl(evento) {
    const start = new Date(evento.date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(evento.title + ' - Math & Beer')}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent('Math & Beer - ' + evento.city + '\nhttps://mathandbeer.com')}&location=${encodeURIComponent(evento.city)}`;
}

function downloadICS(evento) {
    const start = new Date(evento.date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = d => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
    const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Math and Beer//ES',
        'BEGIN:VEVENT',
        `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
        `SUMMARY:${evento.title} - Math & Beer`,
        `DESCRIPTION:Math & Beer - ${evento.city}`,
        `LOCATION:${evento.city}`,
        'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mathandbeer_${evento.title.replace(/\s+/g, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
}

// Función para actualizar las cuentas regresivas
function iniciarCuentasAtras(eventos) {
    setInterval(() => {
        const ahora = new Date().getTime();

        eventos.forEach((evento, index) => {
            const fechaObjetivo = new Date(evento.date).getTime();
            const distancia = fechaObjetivo - ahora;

            const dias = Math.floor(distancia / (1000 * 60 * 60 * 24));
            const horas = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutos = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));
            const segundos = Math.floor((distancia % (1000 * 60)) / 1000);

            const restante = document.getElementById(`restante-${index}`);
            if (restante) {
                restante.innerText = `${String(dias).padStart(2, '0')}d ${String(horas).padStart(2, '0')}h ${String(minutos).padStart(2, '0')}m ${String(segundos).padStart(2, '0')}s`;
            }
        });
    }, 1000);
}
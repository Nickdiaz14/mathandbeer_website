document.addEventListener('DOMContentLoaded', function () {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = '/register?m=Para participar en el Reto Diario primero necesitas registrarte';
        return;
    }
    else {
        fetch(`/api/profile/${userId}`)
            .then(response => response.json())
            .then(data => {
                if (!data.nickname) {
                    window.location.href = '/register?m=Para jugar necesitas un registro previo';
                } else {
                    loadDailyData();
                }
            })
            .catch(error => {
                console.error('Error fetching profile:', error);
                window.location.href = '/register?m=Para jugar necesitas un registro previo';
            });
    }

});

async function loadDailyData() {
    const userId = localStorage.getItem('userId');
    const loading = document.getElementById('daily-loading');
    const content = document.getElementById('daily-content');

    try {
        const response = await fetch(`/api/daily?userid=${userId}`);
        const data = await response.json();

        const streakResponse = await fetch(`/api/streak/${userId}`);
        const streakData = await streakResponse.json();

        // Update Streak
        document.getElementById('streak-current').textContent = streakData.current;
        document.getElementById('streak-best').textContent = streakData.best;
        if (streakData.today) {
            document.getElementById('streak-icon').classList.add('fire-active');
        }

        // Update Game Info
        document.getElementById('daily-date').textContent = formatDate(data.date);
        document.getElementById('daily-game-name').textContent = data.game_name;

        if (data.already_played) {
            showResult(data);
        } else {
            showPlayButton(data);
        }

        loadLeaderboard();

        loading.style.display = 'none';
        content.style.display = 'flex';

    } catch (error) {
        console.error('Error loading daily data:', error);
    }
}

function formatDate(dateStr) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', options);
}

function showPlayButton(data) {
    const playBtn = document.getElementById('daily-play-btn');
    playBtn.style.display = 'block';
    playBtn.onclick = () => {
        // Redirect to the game with daily flag
        let url = '';
        if (data.game_type === '0hh1') {
            url = `/0h_h1?n=${data.game_size}&daily=true`;
        } else if (data.game_type === 'knight') {
            url = `/knight?daily=true`;
        } else if (data.game_type === 'cuentamania') {
            url = `/cuentamania?n=${data.game_size}&daily=true`;
        } else if (data.game_type === '0hn0') {
            url = `/0h_n0?n=${data.game_size}&daily=true`;
        } else if (data.game_type === 'nerdle') {
            url = `/nerdle?n=${data.game_size}&daily=true`;
        }
        window.location.href = url;
    };
}

function showResult(data) {
    const resultDiv = document.getElementById('daily-result');
    const resultValue = document.getElementById('daily-result-value');
    const shareDiv = document.getElementById('daily-share');

    resultDiv.style.display = 'block';
    
    if (data.record_type === 'points') {
        resultValue.textContent = `${data.user_record.toFixed(2)} pts`;
    } else {
        const rec = data.user_record;
        resultValue.textContent = `${Math.floor(rec / 6000).toString().padStart(2, '0')}:${Math.floor((rec % 6000) / 100).toString().padStart(2, '0')}.${(rec % 100).toString().padStart(2, '0')}`;
    }

    shareDiv.style.display = 'flex';
    setupShareButtons(data);
}

async function loadLeaderboard() {
    const userId = localStorage.getItem('userId');
    try {
        const response = await fetch(`/api/daily/leaderboard?userid=${userId}`);
        const data = await response.json();

        document.getElementById('daily-count').textContent = data.count_records;
        const tbody = document.getElementById('daily-ranking');
        tbody.innerHTML = '';

        data.ranking.forEach((register, index) => {
                let colorClass = "#ffffff";
                const mtr = document.createElement('tr');
                const mtd_position = document.createElement('td');
                const mtd_name = document.createElement('td');
                const mtd_record = document.createElement('td');
                const mtd_streak = document.createElement('td');

                // register es el array [posición, nombre, record]
                mtd_position.textContent = register[0];
                mtd_name.textContent = register[1];
                mtd_record.textContent = register[2];
                mtd_streak.innerHTML = register[4] + ' <i class="fa-solid fa-fire me-1"></i>';


                if (index === 0) {
                    colorClass = "#f1c40f";
                } else if (index === 1) {
                    colorClass = "#7bafb9";
                } else if (index === 2) {
                    colorClass = "#bd6104";
                }

                if (localStorage.getItem('userId') === register[3]) {
                    mtr.style.borderLeft = "3px solid var(--accent-math)";
                    mtr.style.borderRight = "3px solid var(--accent-math)";
                    mtd_position.style.backgroundColor = "color-mix(in srgb, var(--accent-math) 8%, transparent)";
                    mtd_name.style.backgroundColor = "color-mix(in srgb, var(--accent-math) 8%, transparent)";
                    mtd_record.style.backgroundColor = "color-mix(in srgb, var(--accent-math) 8%, transparent)";
                    mtd_streak.style.backgroundColor = "color-mix(in srgb, var(--accent-math) 8%, transparent)";
                }

                mtd_position.style.color = colorClass;
                mtd_name.style.color = colorClass;
                mtd_record.style.color = colorClass;
                mtd_streak.style.color = colorClass;

                mtr.appendChild(mtd_position);
                mtr.appendChild(mtd_name);
                mtr.appendChild(mtd_record);
                mtr.appendChild(mtd_streak);
                tbody.appendChild(mtr);
            });

        // If user not in top 10 but has played
        const extraLeaderboard = document.getElementById('extra_leaderboard');
        const extraRanking = document.getElementById('extra_ranking');
        
        if (data.personal_ranking[0] !== '-' && parseInt(data.personal_ranking[0]) > 10) {
            extraLeaderboard.style.display = 'flex';
            extraRanking.innerHTML = '';

            const tr = document.createElement('tr');
            tr.classList.add('my-row');
            tr.innerHTML = `
                <td>${data.personal_ranking[0]}</td>
                <td>${data.personal_ranking[1]}</td>
                <td>${data.personal_ranking[2]}</td>
                <td>${data.personal_ranking[4]}</td>
            `;
            extraRanking.appendChild(tr);
        } else {
            extraLeaderboard.style.display = 'none';
        }
        
        if (data.personal_ranking[0] !== '-') {
            document.getElementById('daily-result-pos').textContent = `Posición: ${data.personal_ranking[0]} de ${data.count_records}`;
        }

    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

function setupShareButtons(data) {
    const userId = localStorage.getItem('userId');
    const waBtn = document.getElementById('daily-share-wa');
    const copyBtn = document.getElementById('daily-share-copy');

    const resultText = document.getElementById('daily-result-value').textContent;
    const shareMsg = `🧠🍺 ¡Completé el Reto Diario de Math & Beer!
Juego: ${data.game_name}
Resultado: ${resultText}
¿Puedes superarme? Juega en: https://mathandbeer.com/daily`;

    waBtn.onclick = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`);
    };

    copyBtn.onclick = () => {
        navigator.clipboard.writeText(shareMsg).then(() => {
            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Copiado!';
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar';
            }, 2000);
        });
    };
}

const userId = localStorage.getItem('userId');

document.addEventListener('DOMContentLoaded', () => {
    if (!userId) {
        window.location.href = '/register?m=Para jugar necesitas un registro previo';
    } else {
        fetch(`/api/profile/${userId}`)
            .then(response => response.json())
            .then(data => {
                if (!data.nickname) {
                    window.location.href = '/register?m=Para jugar necesitas un registro previo';
                } else {
                    const nickname = data.nickname;
                    const nicknameElement = document.getElementsByClassName('title');
                    if (nicknameElement) {
                        nicknameElement[0].innerHTML = '¡Hola, ' + nickname + '! <br> Elige un juego';
                    }
                }
                document.getElementById('loading').style.display = 'none';
                document.getElementById('no-loading').style.display = 'flex';
                document.querySelectorAll('.game:not(.skeleton-game)').forEach((card, i) => {
                    card.style.animationDelay = `${i * 55}ms`;
                    card.classList.add('game-enter');
                });
            })
            .catch(error => {
                console.error('Error fetching profile:', error);
                document.getElementById('loading').style.display = 'none';
                document.getElementById('no-loading').style.display = 'flex';
                document.querySelectorAll('.game').forEach((card, i) => {
                    card.style.animationDelay = `${i * 55}ms`;
                    card.classList.add('game-enter');
                });
            });
    }
});
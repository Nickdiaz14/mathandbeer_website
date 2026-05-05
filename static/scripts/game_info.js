document.addEventListener('DOMContentLoaded', function () {
    const gameInfoButton = document.querySelector('.game_info');

    if (gameInfoButton) {
        // Inicializar el popover con Bootstrap
        const popover = new bootstrap.Popover(gameInfoButton, {
            placement: 'top',
            trigger: 'manual', // Control manual para mostrar/ocultar
            html: true,
            content: '¡Información y reglas del juego aquí!',
        });

        // Mostrar el popover automáticamente después de un pequeño retraso
        setTimeout(function () {
            popover.show();

            // Ocultar automáticamente después de 5 segundos
            setTimeout(function () {
                popover.hide();
            }, 3000);
        }, 5000);
    }
});
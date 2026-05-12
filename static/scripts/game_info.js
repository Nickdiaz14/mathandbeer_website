document.addEventListener('DOMContentLoaded', function () {
    const gameInfoButton = document.querySelector('.game_info');

    if (gameInfoButton) {
        // Inicializar el popover con Bootstrap
        const popover = new bootstrap.Popover(gameInfoButton, {
            placement: 'top',
            trigger: 'manual', // Control manual para mostrar/ocultar
            html: true,
            content: '¡Información y reglas del juego aquí!',
            template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-header text-center"></h3><div class="popover-body text-center"></div></div>',
        });

        // Mostrar el popover automáticamente después de un pequeño retraso
        setTimeout(function () {
            popover.show();

            // Ocultar automáticamente después de 5 segundos
            setTimeout(function () {
                popover.hide();
            }, 30000);
        }, 5000);
    }
});
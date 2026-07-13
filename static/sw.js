self.addEventListener('install', (event) => {
    // Fuerza al Service Worker actual a activarse de inmediato
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Elimina el control del service worker sobre la página actual
    event.waitUntil(
        self.clients.claim().then(() => {
            // Se desregistra a sí mismo del navegador del usuario
            return self.registration.unregister();
        })
    );
});
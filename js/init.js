// js/init.js
// Este archivo DEBE cargarse al final de todos los demás módulos de App.
// Se encarga de arrancar la aplicación cuando el DOM está listo.

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado. Inicializando aplicación...');
    const loadingOverlay = document.getElementById('loading-overlay');

    // La inicialización ahora es más limpia. Cada módulo se encarga de sí mismo.
    // El orden es importante: los módulos de datos primero.
    App.state.init(); 
    App.firebase.init();
    App.validation.init();
    App.organizer.init();
    App.ui.init(); // La UI se inicializa para poder mostrar notificaciones si algo falla.
    App.dragDrop.init();

    // Si la inicialización del estado falló (no encontró el pensum), ui.init ya habrá
    // mostrado un error y no debemos continuar.
    if (!App.state.isReady()) {
        loadingOverlay.classList.add('hidden');
        return;
    }

    // Configurar el observador de autenticación, que controla el flujo principal
    App.firebase.onAuthStateChanged(user => {
        if (user) {
            console.log('Usuario autenticado:', user.uid);
            loadingOverlay.classList.remove('hidden');
            
            App.state.setCurrentUser(user);
            App.ui.showAppUI();
            App.ui.updateUserInfo(user);

            // Escuchar cambios en el plan del usuario en tiempo real
            App.firebase.listenToUserPlan(user.uid, App.state.getCurrentCareerId());
        } else {
            console.log('No hay usuario autenticado.');
            App.state.setCurrentUser(null);
            App.ui.showLoginUI();
            
            if (App.state.getUnsubscribePlanner()) {
                App.state.getUnsubscribePlanner()();
            }
            loadingOverlay.classList.add('hidden');
        }
    });
});

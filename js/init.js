// js/init.js
// Este archivo DEBE cargarse al final de todos los demás módulos de App.
// Se encarga de arrancar la aplicación cuando el DOM está listo.

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado. Inicializando aplicación...');
    const loadingOverlay = document.getElementById('loading-overlay');

    // ========================================================================
    // VERIFICACIÓN CRÍTICA: Asegurarse de que los datos del pensum existen
    // ========================================================================
    if (typeof window.PENSUM_DI === 'undefined' || !window.PENSUM_DI) {
        console.error("ERROR FATAL: La variable PENSUM_DI no está definida. Revisa que el archivo 'pensums/pensum-di.js' se esté cargando correctamente en index.html y no tenga errores.");
        App.ui.init(); // Inicializar solo la UI para poder mostrar notificaciones.
        App.ui.showNotification("Error Crítico: No se pudieron cargar los datos de la carrera.", "error", 20000);
        loadingOverlay.classList.add('hidden');
        return; // Detener la ejecución para prevenir más errores.
    }

    // Si la verificación pasa, proceder con la inicialización normal.
    App.state.init(window.PENSUM_DI); 
    App.firebase.init();
    App.validation.init();
    App.organizer.init();
    App.ui.init();
    App.dragDrop.init();

    // Configurar el observador de autenticación
    App.firebase.onAuthStateChanged(user => {
        if (user) {
            console.log('Usuario autenticado:', user.uid);
            loadingOverlay.classList.remove('hidden');
            
            App.state.setCurrentUser(user);
            App.ui.showAppUI();
            App.ui.updateUserInfo(user);

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

/* Variables de Tema */
:root {
    --bg-primary: #1a1a1a;
    --bg-secondary: #212121;
    --bg-tertiary: #2a2a2a;
    --text-primary: #e5e5e5;
    --text-secondary: #a3a3a3;
    --border-color: #404040;
    --accent-color: #facc15; /* yellow-400 */
    --accent-hover: #eab308; /* yellow-500 */
    --accent-text: #1a1a1a;
    --danger-color: #ef4444; /* red-500 */
    --danger-hover: #dc2626; /* red-600 */
    --success-color: #22c55e; /* green-500 */
}

[data-theme="light"] {
    --bg-primary: #f5f5f5;
    --bg-secondary: #ffffff;
    --bg-tertiary: #f0f0f0;
    --text-primary: #1a1a1a;
    --text-secondary: #525252;
    --border-color: #d4d4d4;
    --accent-color: #f59e0b; /* amber-500 */
    --accent-hover: #d97706; /* amber-600 */
    --accent-text: #ffffff;
}

/* Estilos Generales */
body {
    font-family: 'Inter', sans-serif;
    transition: background-color 0.3s, color 0.3s;
}

.hidden { display: none !important; }

/* Botones */
.btn-primary { background-color: var(--accent-color); color: var(--accent-text); transition: background-color 0.2s; padding: 0.5rem 1rem; }
.btn-primary:hover { background-color: var(--accent-hover); }
.btn-secondary { background-color: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); transition: background-color 0.2s; padding: 0.5rem 1rem; }
.btn-secondary:hover { background-color: var(--border-color); }
.btn-danger { background-color: var(--danger-color); color: white; transition: background-color 0.2s; padding: 0.5rem 1rem; }
.btn-danger:hover { background-color: var(--danger-hover); }

/* Interruptor de Tema */
.theme-switch { position: relative; display: inline-block; width: 50px; height: 28px; }
.theme-switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--bg-tertiary); transition: .4s; border-radius: 34px; }
.slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: var(--accent-color); }
input:checked + .slider:before { transform: translateX(22px); }

/* Contenedor Principal de la App */
#app-container { display: flex; flex-direction: column; height: 100vh; }
main { flex-grow: 1; display: flex; overflow: hidden; }
#left-panel { height: calc(100vh - 72px); }
#right-panel { height: calc(100vh - 72px); }

/* Semestres */
.semesters-grid-container { display: flex; gap: 1rem; height: 100%; padding-bottom: 20px; }
.semester-column { width: 300px; min-width: 300px; background-color: var(--bg-secondary); border-radius: 0.5rem; flex-shrink: 0; display: flex; flex-direction: column; transition: width 0.3s; }
.semester-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-bottom: 1px solid var(--border-color); }
.semester-content { padding: 0.75rem; overflow-y: auto; flex-grow: 1; space-y: 0.5rem; }
.semester-footer { padding: 0.5rem 0.75rem; border-top: 1px solid var(--border-color); font-size: 0.8rem; font-weight: 600; }
.semester-column.collapsed .semester-content, .semester-column.collapsed .semester-footer { display: none; }
.semester-column.collapsed { width: 60px; min-width: 60px; }
.semester-column.collapsed .semester-header h3 { display: none; }
.semester-column.collapsed .semester-header .semester-credits { writing-mode: vertical-rl; text-orientation: mixed; margin: 0 auto; }

/* Tarjeta de Materia */
.subject-card {
    background-color: var(--bg-tertiary);
    border-left: 5px solid var(--border-color);
    cursor: grab;
    transition: all 0.2s ease-in-out;
}
.subject-card.dragging { opacity: 0.5; transform: scale(0.95); }
.subject-card.locked { opacity: 0.6; cursor: not-allowed; border-left-color: var(--danger-color); }
.subject-card.completed {
    border-left-color: var(--success-color) !important;
    background-color: #283c30; /* Un verde oscuro sutil */
}
.subject-card.completed .subject-name { text-decoration: line-through; color: var(--text-secondary); }
.subject-card .subject-code { font-size: 0.75rem; color: var(--text-secondary); }
.subject-card .delete-btn {
    position: absolute; top: 5px; right: 5px; background: none; border: none; color: var(--text-secondary);
    font-size: 1.2rem; cursor: pointer; display: none;
}
.subject-card:hover .delete-btn { display: block; }

/* Modales */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 50; }
.modal-content { background-color: var(--bg-secondary); padding: 2rem; border-radius: 0.5rem; width: 90%; max-width: 500px; position: relative; }
.modal-close-btn { position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 2rem; color: var(--text-secondary); cursor: pointer; }
.modal-tab { padding: 0.5rem 1rem; cursor: pointer; border-bottom: 2px solid transparent; }
.modal-tab.active { border-bottom-color: var(--accent-color); color: var(--accent-color); }
.modal-tab-content { display: none; }
.modal-tab-content.active { display: block; }
#elective-catalog-list { max-height: 50vh; overflow-y: auto; }

/* Loader */
.loader { border: 5px solid var(--bg-tertiary); border-top: 5px solid var(--accent-color); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* Responsividad */
@media (max-width: 1024px) {
    main { flex-direction: column; }
    #left-panel, #right-panel { width: 100%; height: auto; }
    #right-panel { overflow-x: auto; }
    .semesters-grid-container { padding-bottom: 1rem; }
}

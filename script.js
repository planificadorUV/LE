document.addEventListener('DOMContentLoaded', () => {
    // --- DATOS INICIALES (ACTUALIZADOS SEGÚN PDF OFICIAL) ---
    const initialSubjects = [
        // Ciclo Básico (AB)
        { id: '506026C', name: 'ESCRITURA, EXPRESIÓN Y COMUNICACIÓN', credits: 3, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507048C', name: 'PRODUCCIÓN INTERSUBJETIVA DEL ESPACIO FÍSICO Y SOCIAL', credits: 2, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507031C', name: 'DISEÑO MUNDO', credits: 3, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507044C', name: 'DISEÑO PARA LA PAZ SOSTENIBLE', credits: 2, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507026C', name: 'SEMINARIO DE INVESTIGACIÓN', credits: 2, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507046C', name: 'FUNDAMENTOS SOCIALES Y CULTURALES DEL DISEÑO', credits: 2, cycle: 'Básico', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507055C', name: 'PERCEPCIÓN VISUAL', credits: 2, cycle: 'Básico', area: 'Diseño', prerequisites: [] },
        { id: '5070170', name: 'MÉTODOS DE DISEÑO', credits: 2, cycle: 'Básico', area: 'Diseño', prerequisites: [] },
        { id: '507025C', name: 'PROYECTO - SER HUMANO', credits: 7, cycle: 'Básico', area: 'Diseño', prerequisites: [] },
        { id: '507008C', name: 'CREACIÓN DE LA FORMA', credits: 2, cycle: 'Básico', area: 'Diseño', prerequisites: [] },
        { id: '507024C', name: 'PROYECTOS - RELACIONES Y VÍNCULOS', credits: 4, cycle: 'Básico', area: 'Diseño', prerequisites: [] },
        { id: '507053C', name: 'ESTUDIOS VISUALES', credits: 2, cycle: 'Básico', area: 'Diseño', prerequisites: [] },
        { id: '507021C', name: 'PROYECTOS - ESTRUCTURAS Y AUTONOMÍAS', credits: 4, cycle: 'Básico', area: 'Diseño', prerequisites: [] },
        { id: '507010C', name: 'GEOMETRÍA', credits: 2, cycle: 'Básico', area: 'Tecnología', prerequisites: [] },
        { id: '507011C', name: 'HERRAMIENTAS DIGITALES - PROGRAMACIÓN', credits: 2, cycle: 'Básico', area: 'Tecnología', prerequisites: [] },
        { id: '507012C', name: 'INTRODUCCIÓN MATERIALES Y PROCESOS', credits: 2, cycle: 'Básico', area: 'Tecnología', prerequisites: [] },
        { id: '507013C', name: 'MATEMÁTICAS', credits: 2, cycle: 'Básico', area: 'Tecnología', prerequisites: [] },
        { id: '507047C', name: 'HERRAMIENTAS DIGITALES - REPRESENTACIÓN', credits: 2, cycle: 'Básico', area: 'Tecnología', prerequisites: [] },
        { id: '507009C', name: 'FÍSICA PARA EL DISEÑO', credits: 2, cycle: 'Básico', area: 'Tecnología', prerequisites: [] },
        { id: '507014C', name: 'MATERIALES Y PROCESOS - METALES', credits: 3, cycle: 'Básico', area: 'Tecnología', prerequisites: [] },

        // Ciclo Profesional (AP)
        { id: '507015C', name: 'MATERIALES Y PROCESOS - NUEVOS MATERIALES', credits: 3, cycle: 'Profesional', area: 'Tecnología', prerequisites: [] },
        { id: '507023C', name: 'PROYECTO - PRODUCTO', credits: 7, cycle: 'Profesional', area: 'Diseño', prerequisites: [] },
        { id: '507059C', name: 'HERRAMIENTAS DIGITALES - COMPROBACIÓN', credits: 2, cycle: 'Profesional', area: 'Tecnología', prerequisites: [] },
        { id: '507095C', name: 'PROYECTO FINAL DESARROLLO', credits: 4, cycle: 'Profesional', area: 'Diseño', prerequisites: ['507096C'] },
        { id: '507111C', name: 'DISEÑO COLONIAL Y MODERNIDAD D.I.', credits: 2, cycle: 'Profesional', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507115C', name: 'PROYECTO - GESTIÓN', credits: 7, cycle: 'Profesional', area: 'Diseño', prerequisites: [] },
        { id: '507016C', name: 'MATERIALES Y PROCESOS - POLIMEROS', credits: 3, cycle: 'Profesional', area: 'Tecnología', prerequisites: [] },
        { id: '507020C', name: 'PROYECTO - ENTORNO', credits: 7, cycle: 'Profesional', area: 'Diseño', prerequisites: [] },
        { id: '507035C', name: 'DISIDENCIAS Y RESISTENCIAS', credits: 3, cycle: 'Profesional', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507060C', name: 'HERRAMIENTAS DIGITALES - CREACIÓN VISUALIZACIÓN', credits: 2, cycle: 'Profesional', area: 'Tecnología', prerequisites: [] },
        { id: '507019C', name: 'PROYECTO - BIOSFERA', credits: 7, cycle: 'Profesional', area: 'Diseño', prerequisites: [] },
        { id: '507036C', name: 'ESTUDIOS CRÍTICOS DEL DISEÑO', credits: 3, cycle: 'Profesional', area: 'Sociedad y cultura', prerequisites: [] },
        { id: '507058C', name: 'HERRAMIENTAS DIGITALES - SIMULACIÓN', credits: 2, cycle: 'Profesional', area: 'Tecnología', prerequisites: [] },
        { id: '507096C', name: 'PROYECTO FINAL FORMULACIÓN', credits: 3, cycle: 'Profesional', area: 'Diseño', prerequisites: ['507012C'] }
    ];

    const predefinedProfElectives = [
        { id: "507092C", name: "BIOMIMESIS", credits: 2 },
        { id: "507082C", name: "COLOR", credits: 3 },
        { id: "507057C", name: "CREACIÓN CON MADERA", credits: 2 },
        { id: "507083C", name: "CRÍTICA DE LAS MERCANCÍAS Y EL CONSUMO", credits: 3 },
        { id: "507062C", name: "DIBUJO TÉCNICO PARA DISEÑO INDUSTRIAL", credits: 2 },
        { id: "507090C", name: "DISEÑO DE APLICACIONES MÓVILES", credits: 3 },
        { id: "507093C", name: "DISEÑO Y PROTOTIPADO DE SISTEMAS ROBÓTICOS", credits: 3 },
        { id: "507061C", name: "ESTRATEGIAS DE ECODISEÑO", credits: 2 },
        { id: "507084C", name: "ESTUDIOS CRÍTICOS SOBRE LOS RESIDUOS", credits: 3 },
        { id: "507094C", name: "PRÁCTICAS ESCRITURALES", credits: 2 },
        { id: "507109C", name: "SOSTENIBILIDAD EN LA INDUSTRIA TEXTIL", credits: 3 },
        { id: "507105C", name: "MORFOLOGÍA EXPERIMENTAL EN EL DISEÑO INDUSTRIAL", credits: 3 },
        { id: "507106C", name: "PROCESOS DE FABRICACIÓN ADITIVA - IMPRESIÓN TRIDIMENSIONAL (3D)", credits: 3 },
        { id: "507110C", name: "TÉCNICAS DE PROTOTIPADO RÁPIDO", credits: 3 },
        { id: "507108C", name: "EL GÉNERO EN LOS OBJETOS", credits: 3 },
        { id: "507113C", name: "MARKETING DE PRODUCTO", credits: 3 },
        { id: "507112C", name: "ELEMENTOS PARA DISEÑO DE INTERIORES", credits: 3 },
        { id: "507114C", name: "PRÁCTICAS ESCRITURALES", credits: 3 },
        { id: "507051C", name: "PRÁCTICA EN INVESTIGACIÓN-CREACIÓN", credits: 3 },
        { id: "507118C", name: "PRODUCCIÓN DE PLATAFORMAS CULTURALES PARA ARTE Y DISEÑO", credits: 3 },
        { id: "507122C", name: "DISEÑO INDUSTRIAL CONTEMPORÁNEO", credits: 3 },
        { id: "507121C", name: "REUSO Y RECICLAJE CREATIVO", credits: 3 },
        { id: "507120C", name: "MODELOS EN REPETICIÓN", credits: 3 },
        { id: "507119C", name: "DISEÑO + ARTE CONTEMPORÁNEO", credits: 3 },
    ];

    const predefinedFGElectives = [
        // Científico Tecnológico
        { id: "417016C", name: "ESTRATEGIAS PARA EL APRENDIZAJE AUTÓNOMO", credits: 3 },
        { id: "417017C", name: "APROPIACIÓN DIGITAL Y APRENDIZAJE SIGNIFICATIVO", credits: 3 },
        { id: "106030C", name: "HUMANITAS, CIENCIA, AGRICULTURA Y CAMBIO CLIMÁTICO", credits: 3 },
        { id: "801127C", name: "CONFLUENCIA DE REALIDADES: NATURALEZA Y SOCIEDAD", credits: 3 },
        { id: "801044C", name: "TALLER DE HABILIDADES INFORMÁTICAS PARA LA GESTIÓN", credits: 3 },
        { id: "602001C", name: "EN SUS MARCAS, UN, DOS, TIC, APRENDO", credits: 3 },
        { id: "201012C", name: "EDUCACIÓN Y TIC", credits: 3 },
        { id: "106002C", name: "INTRODUCCIÓN A LA EXPERIMENTACIÓN CIENTÍFICA", credits: 3 },
        { id: "102052C", name: "BIOLOGÍA GENERAL - CIENCIAS", credits: 4 },
        { id: "116019C", name: "INTRODUCCIÓN A LAS TECNOLOGÍAS", credits: 2 },
        { id: "204054C", name: "ACTIVIDADES DE APRENDIZAJE MEDIADAS POR LAS TIC", credits: 3 },
        { id: "111023C", name: "MATEMÁTICAS BÁSICAS", credits: 3 },
        { id: "111002C", name: "INTRODUCCIÓN AL MODELAMIENTO MATEMÁTICO", credits: 3 },
        { id: "116009C", name: "INTRODUCCIÓN A LAS CIENCIAS NATURALES", credits: 4 },
        { id: "116020C", name: "TALLER TECNOLÓGICO I", credits: 3 },
        { id: "201022C", name: "INSTRUMENTOS E MODELOS DE ANÁLISIS ECONÓMICO PARA LA HISTORIA", credits: 3 },
        { id: "620013C", name: "CUIDADOS PALIATIVOS CON ENFOQUE TRANSDISCIPLINAR", credits: 2 },
        { id: "203019C", name: "HISTORIA DEL DESARROLLO DE LA INTELIGENCIA ARTIFICIAL Y SUS APLICACIONES", credits: 3 },
        { id: "620011C", name: "ABORDAJE INTEGRAL A LAS PERSONAS CON SITUaciones ONCOLÓGICAS", credits: 2 },
        { id: "801157C", name: "INTELIGENCIA DE NEGOCIOS Y ANALÍTICA DE DATOS PARA LA GESTIÓN", credits: 3 },
        { id: "802064C", name: "SEGURIDAD DE LA INFORMACIÓN FINANCIERA Y CONTABLE", credits: 3 },
        { id: "415006C", name: "NUEVAS TECNOLOGÍAS Y EDUCACIÓN", credits: 3 },
        { id: "406015C", name: "APORTE DE LAS TIC EN LA ENSEÑANZA DE LAS CIENCIAS", credits: 3 },
        { id: "505134C", name: "EDICIÓN DE PARTITURAS", credits: 2 },
        { id: "750002C", name: "INFORMÁTICA I", credits: 3 },
        { id: "750011C", name: "FUNDAMENTOS DE PROGRAMACIÓN", credits: 3 },
        { id: "750012C", name: "FUNDAMENTOS DE PROGRAMACIÓN IMPERATIVA", credits: 3 },
        { id: "750007C", name: "FUNDAMENTOS Y APLICACIONES DE LA PROGRAMACIÓN COMPUTACIONAL", credits: 4 },
        { id: "770001C", name: "CIENCIAS DE LOS MATERIALES", credits: 3 },
        { id: "710004C", name: "TALLER DE INGENIERÍA II", credits: 2 },
        { id: "102081C", name: "INSECTOS Y SOCIEDAD", credits: 3 },
        { id: "1303004C", name: "FUNDAMENTOS DE PROGRAMACIÓN PARA ECONOMÍA", credits: 4 },
        { id: "303025C", name: "CIENCIAS AMBIENTALES", credits: 3 },
        { id: "406001C", name: "FUNDAMENTACIÓN EN CIENCIAS, TECNOLOGÍA, SOCIEDAD Y AMBIENTE", credits: 3 },
        { id: "416047C", name: "NUMEROS Y ESTADISTICAS PARA PENSAR LA EDUCACIÓN POPULAR", credits: 3 },
        { id: "607008C", name: "RAZA, ETNIA, RACISMO Y SALUD PÚBLICA", credits: 3 },
        { id: "111061C", name: "FUNDAMENTOS INICIALES DE MATEMÁTICA UNIVERSITARIA", credits: 3 },
        { id: "730111C", name: "TALLER TECNOLÓGICO I: GESTIÓN DE LA CONSERVACIÓN", credits: 3 },
        // Formación Social y Ciudadana
        { id: "415007C", name: "FORMACIÓN CIUDADANA Y CONSTITUCIÓN POLÍTICA DE COLOMBIA", credits: 3 },
        { id: "304035C", name: "GÉNERO, PLURALIDAD Y DIVERSIDAD", credits: 3 },
        { id: "506015C", name: "COMUNICACIÓN, GÉNERO Y DIVERSIDAD", credits: 3 },
        { id: "415011C", name: "EDUCACIÓN COMUNIDADES NEGRAS, AFROCOLOMBIANAS, RAIZALES, PALENQUERAS", credits: 3 },
        { id: "801042C", name: "INTRODUCCIÓN AL DERECHO Y CONSTITUCIÓN POLÍTICA", credits: 3 },
        { id: "730025C", name: "SEMINARIO EN CONSTITUCIÓN, LEGISLACIÓN Y ÉTICA DE LA PROFESIÓN", credits: 2 },
        { id: "730011C", name: "FUNDAMENTOS SISTEMAS SOCIOECOLÓGICOS", credits: 3 },
        { id: "204058C", name: "RESOLUCIÓN DE CONFLICTOS EN LA ESCUELA GÉNERO Y DIVERSIDAD", credits: 3 },
        { id: "102061C", name: "ÉTICA Y RESPONSABILIDAD SOCIAL", credits: 3 },
        { id: "760018C", name: "INGENIERÍA Y SOCIEDAD", credits: 3 },
        { id: "801078C", name: "CIENCIAS HUMANAS", credits: 2 },
        { id: "203001C", name: "CULTURA DE PAZ/CONSTRUCCIÓN DE CULTURA DE PAZ", credits: 3 },
        { id: "801112C", name: "RESPONSABILIDAD SOCIAL Y GESTIÓN HUMANA EN EL SECTOR PÚBLICO", credits: 3 },
        { id: "102062C", name: "FUNDAMENTOS DE SUSTENTABILIDAD Y AMBIENTE", credits: 3 },
        { id: "201002C", name: "CIENCIAS SOCIALES Y CIUDADANÍA", credits: 3 },
        { id: "802027C", name: "MECANISMOS DE CONTROL ORGANIZACIONES CIVILES Y PARTICIPACIÓN CIUDADANA", credits: 3 },
        { id: "730012C", name: "FUNDAMENTOS DE PROCESOS SOCIALES", credits: 3 },
        { id: "202023C", name: "LEGISLACIÓN EDUCATIVA EN COLOMBIA", credits: 3 },
        { id: "201001C", name: "ANTROPOLOGÍA Y DEMOCRACIA", credits: 3 },
        { id: "507003C", name: "DISEÑO PARA LA PAZ DG", credits: 3 },
        { id: "203013C", name: "ÉTICA Y POLÍTICA", credits: 3 },
        { id: "406008C", name: "PENSAMIENTO HISTÓRICO - FILOSÓFICO EN LA ENSEÑANZA DE LAS CIENCIAS", credits: 2 },
        { id: "406025C", name: "POLÍTICAS PÚBLICAS EDUCATIVAS DEL ESTADO", credits: 3 },
        { id: "507089C", name: "PROYECTO BIOSFERA - DISEÑO ONTOLÓGICO", credits: 3 },
        { id: "607007C", name: "COMER: SABORES, LUCHAS Y SALUD PÚBLICA", credits: 3 },
        { id: "607010C", name: "SEGURIDAD FINANCIERA Y DECISIONES RESPONSABLES", credits: 3 },
        { id: "620021C", name: "DISCAPACIDAD, SOCIEDAD Y CULTURA", credits: 3 },
        { id: "106036C", name: "NORMATIVIDAD Y ÉTICA PROFESIONAL", credits: 2 },
        { id: "406018C", name: "EL PENSAMIENTO DOCENTE", credits: 3 },
        { id: "406006C", name: "COSMOVISIONES Y TEORÍAS DEL CONOCIMIENTO", credits: 2 },
        { id: "404047C", name: "EDUCACIÓN PARA LA PAZ", credits: 2 },
        { id: "201069C", name: "DISCRIMINACIÓN, EMPODERAMIENTO Y CIUDADANÍA", credits: 3 },
        { id: "415037C", name: "EDUCACIÓN SUPERIOR Y CONTEXTOS SOCIOPOLÍTICOS Y PROFESIONALES CONTEMPORÁNEOS", credits: 3 },
        { id: "415041C", name: "PEDAGOGÍA, ÉTICA E INFANCIA", credits: 3 },
        { id: "D02006C", name: "CÁTEDRA DE LA JEP", credits: 3 },
        { id: "303002C", name: "FILOSOFÍA POLÍTICA", credits: 3 },
        { id: "303003C", name: "TEORÍA SOCIAL", credits: 3 },
        // Lenguaje y Comunicación
        { id: "204133C", name: "COMPRENSIÓN Y PRODUCCIÓN DE TEXTOS ACADÉMICOS GENERALES", credits: 2 },
        { id: "203012C", name: "ESPAÑOL Y COMUNICACIÓN I", credits: 2 },
        { id: "415008C", name: "TALLER DE LECTURA Y ESCRITURA I", credits: 2 },
        { id: "416009C", name: "HERRAMIENTAS PARA PENSAR Y RECREAR - ARGUMENTOS Y TEXTOS ACADÉMICOS", credits: 2 },
        { id: "416035C", name: "ARTESANIAS DE LA PRODUCCION INTELECTUAL I", credits: 3 },
        { id: "416045C", name: "ARTESANIAS DE LA PRODUCCION INTELECTUAL II", credits: 3 },
        // Estilos de Vida Saludable
        { id: "603032C", name: "HABILIDADES PARA LA VIDA", credits: 3 },
        { id: "404032C", name: "DEPORTE FORMATIVO", credits: 3 },
        { id: "410029C", name: "HATHA YOGA", credits: 3 },
        { id: "607003C", name: "INTRODUCCIÓN A LAS INTERVENCIONES ASISTIDAS CON ANIMALES", credits: 3 },
        { id: "607004C", name: "APNEA: MENTE, CUERPO Y VIDA SALUDABLE", credits: 3 },
        { id: "404002C", name: "DEPORTE Y SALUD", credits: 2 },
        { id: "402002C", name: "CORPORALIDAD EN MOVIMIENTO (PSICOMOTRICIDAD)", credits: 2 },
        { id: "415026C", name: "JUEGO Y MOVIMIENTO PARA LA VIDA", credits: 3 },
        { id: "415024C", name: "AUTOCUIDADO Y PROYECTO DE VIDA SALUDABLE", credits: 3 },
        { id: "605010C", name: "PRINCIPIO DE NUTRICIÓN, ALIMENTACIÓN Y SALUD", credits: 3 },
        { id: "404028C", name: "DANZA Y EXPRESIÓN CORPORAL", credits: 3 },
        { id: "504070C", name: "PRÁCTICAS ARTÍSTICAS, CUERPO Y SALUD MENTAL", credits: 3 },
        { id: "411003C", name: "PROYECTO DE VIDA I", credits: 3 },
        { id: "411004C", name: "PROYECTO DE VIDA II", credits: 3 },
        // Artístico Humanístico
        { id: "402051C", name: "VIDA UNIVERSITARIA I: ENCUENTROS CON LA UNIVERSIDAD", credits: 3 },
        { id: "204124C", name: "NARRATIVAS DE VIDA", credits: 3 },
        { id: "417008C", name: "CIENCIA, CULTURA Y CREATIVIDAD", credits: 3 },
        { id: "402014C", name: "LÚDICA Y ESTESIS EN LA CONSTITUCIÓN DEL SER HUMANO", credits: 2 },
        { id: "504001C", name: "EL ARTE DE EXPRESARSE EN PÚBLICO", credits: 4 },
        { id: "504002C", name: "TALLER DE CREATIVIDAD AUDIOVISUAL", credits: 4 },
        { id: "504003C", name: "TALLER DE GUION AUDIOVISUAL PARA PRINCIPIANTES", credits: 4 },
        { id: "504019C", name: "ESTÉTICAS DE LA RESISTENCIA", credits: 4 },
        { id: "504037C", name: "TALLER DE APRECIACIÓN DEL TEATRO", credits: 3 },
        { id: "504038C", name: "ACTUACIÓN ANTE CÁMARAS", credits: 3 },
        { id: "504048C", name: "CONCEPTUALIZACIÓN Y DISEÑO DE PROYECTOS CULTURALES", credits: 3 },
        { id: "504049C", name: "ANÁLISIS ACTIVO A PERSONAJES FEMENINOS DE LA DRAMATURGIA", credits: 3 },
        { id: "504050C", name: "HERRAMIENTAS DIDÁCTICAS PARA LA ESCUELA - TÉCNICAS BÁSICAS DE CONSTRUCCIÓN Y MANEJO DE TÍTERES", credits: 3 },
        { id: "504051C", name: "JUEGOS ACROBÁTICOS EXPRESIÓN CORPORAL PARA NO ACTORES", credits: 3 },
        { id: "504052C", name: "TEATRO, SUEÑO Y CREACIÓN", credits: 3 },
        { id: "504053C", name: "TEATROS Y TEATRALIDADES DEL MUNDO", credits: 3 },
        // Emprendimiento
        { id: "507098C", name: "EMPRENDIMIENTO, CULTURA Y CIUDAD", credits: 3 },
        { id: "507099C", name: "DESARROLLO DE PROYECTO EMPRENDEDOR", credits: 3 },
        { id: "507100C", name: "DESARROLLO DE LA CREATIVIDAD", credits: 3 },
        { id: "507101C", name: "DESARROLLO DE CLIENTES", credits: 3 },
    ];

    // --- ESTADO DE LA APLICACIÓN ---
    let state = {
        subjects: [],
        semesters: [],
        nextSemesterId: 1,
        nextElectiveId: 1,
    };

    const defaultSemesterColor = () => document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#212121';

    // --- MANEJO DE ESTADO (LOCALSTORAGE) ---
    const loadState = () => {
        const savedState = localStorage.getItem('univalleDisenoPlannerV10');
        if (savedState) {
            const parsed = JSON.parse(savedState);
            state = { ...state, ...parsed };
            state.semesters.forEach(s => {
                if (!s.color) s.color = defaultSemesterColor();
                if (!s.period) s.period = '';
            });
            if (!state.nextElectiveId) state.nextElectiveId = 1;
        } else {
            state.subjects = initialSubjects.map(s => ({ ...s, location: 'bank', completed: false, isElective: false }));
        }
    };

    const saveState = () => {
        localStorage.setItem('univalleDisenoPlannerV10', JSON.stringify(state));
    };

    // --- RENDERIZADO ---
    const createSubjectCard = (subject) => {
        const card = document.createElement('div');
        card.id = `subject-${subject.id}`;
        card.dataset.id = subject.id;
        card.className = 'subject-card p-3 rounded-lg flex flex-col items-start';
        card.draggable = true;
        
        let deleteButton = '';
        if (subject.isElective && subject.id.startsWith('elective-')) { // Only custom electives can be deleted
            deleteButton = `<button class="delete-elective-btn" data-id="${subject.id}" title="Eliminar electiva">&times;</button>`;
        }

        let typeTag = '';
        let typeColor = 'bg-gray-500';
        if (subject.isElective) {
            if(subject.electiveType === 'fg') {
                typeTag = 'FG';
                typeColor = 'bg-blue-500';
            } else {
                typeTag = 'EP';
                typeColor = 'bg-purple-500';
            }
        } else {
            if (subject.cycle === 'Básico') {
                typeTag = 'AB';
                typeColor = 'bg-green-500';
            } else if (subject.cycle === 'Profesional') {
                typeTag = 'AP';
                typeColor = 'bg-orange-500';
            }
        }
        const areaTag = subject.area ? `<span class="subject-tag bg-gray-600 text-white">${subject.area}</span>` : '';


        card.innerHTML = `
            <div class="w-full flex justify-between items-start">
                <p class="text-sm font-medium pr-2 flex-grow">${subject.name}</p>
                <span class="credits-badge text-xs font-bold px-2 py-1 rounded-full flex-shrink-0">${subject.credits} C</span>
            </div>
            <div class="mt-2 flex gap-1">
                <span class="subject-tag ${typeColor} text-white">${typeTag}</span>
                ${areaTag}
            </div>
            ${deleteButton}
        `;
        
        if (subject.completed) card.classList.add('completed');
        
        const prereqsMet = subject.prerequisites.every(pId => state.subjects.find(s => s.id === pId)?.completed);
        if (!prereqsMet && !subject.completed) card.classList.add('locked');
        
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-elective-btn')) {
                toggleSubjectComplete(subject.id);
            }
        });
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        
        if (deleteButton) {
            card.querySelector('.delete-elective-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteElective(subject.id);
            });
        }
        return card;
    };
    
    const render = () => {
        renderStatsBoard();
        renderSubjectBank();
        renderSemesters();
        updateStats();
        saveState();
    };

    const renderStatsBoard = () => {
        const container = document.querySelector('.stats-board');
        container.innerHTML = '';
        const stats = [
            { id: 'total-credits', label: 'CRÉDITOS TOTALES', total: 140 },
            { id: 'basic-cycle-credits', label: 'CICLO BÁSICO', total: 49 },
            { id: 'professional-cycle-credits', label: 'CICLO PROFESIONAL', total: 57 },
            { id: 'fg-credits', label: 'FORMACIÓN GENERAL', total: 17 },
            { id: 'prof-electives-credits', label: 'ELECTIVAS PROFESIONALES', total: 17 }
        ];
        stats.forEach(stat => {
            const card = document.createElement('div');
            card.className = 'text-center bg-secondary p-4 rounded-lg';
            card.innerHTML = `<h3 class="text-xs font-semibold text-secondary uppercase">${stat.label}</h3><p id="${stat.id}" class="text-xl font-bold">0 / ${stat.total}</p><div class="progress-bar-container mt-2"><div id="${stat.id}-bar" class="progress-bar-fill"></div></div>`;
            container.appendChild(card);
        });
    };

    const renderSubjectBank = () => {
        const bankContent = document.getElementById('bank-content');
        bankContent.innerHTML = '';
        const cycles = ['Básico', 'Profesional'];
        const areas = ['Sociedad y cultura', 'Diseño', 'Tecnología'];
        cycles.forEach(cycle => {
            const cycleEl = document.createElement('div');
            cycleEl.className = 'mb-6';
            cycleEl.innerHTML = `<h3 class="text-lg font-semibold mb-2">${cycle}</h3>`;
            const areaContainer = document.createElement('div');
            areaContainer.id = `bank-${cycle.toLowerCase()}`;
            areaContainer.className = 'space-y-4 p-2 rounded-lg';
            areaContainer.addEventListener('dragover', handleDragOver);
            areaContainer.addEventListener('drop', handleDrop);
            areas.forEach(area => {
                const areaSubjects = state.subjects.filter(s => !s.isElective && s.cycle === cycle && s.area === area && s.location === 'bank');
                if (areaSubjects.length > 0) {
                    const areaEl = document.createElement('div');
                    areaEl.innerHTML = `<h4 class="area-title text-sm font-bold uppercase pb-1 mb-2">${area}</h4>`;
                    const subjectList = document.createElement('div');
                    subjectList.className = 'space-y-2';
                    areaSubjects.forEach(s => subjectList.appendChild(createSubjectCard(s)));
                    areaEl.appendChild(subjectList);
                    areaContainer.appendChild(areaEl);
                }
            });
            cycleEl.appendChild(areaContainer);
            bankContent.appendChild(cycleEl);
        });
        
        const createdElectives = state.subjects.filter(s => s.isElective && s.location === 'bank');
        if (createdElectives.length > 0) {
            const electivesEl = document.createElement('div');
            electivesEl.className = 'mb-6';
            electivesEl.innerHTML = `<h3 class="text-lg font-semibold mb-2">Mis Electivas</h3>`;
            const electiveList = document.createElement('div');
            electiveList.className = 'space-y-2 p-2 rounded-lg';
            electiveList.id = 'bank-electives';
            electiveList.addEventListener('dragover', handleDragOver);
            electiveList.addEventListener('drop', handleDrop);
            createdElectives.forEach(s => electiveList.appendChild(createSubjectCard(s)));
            electivesEl.appendChild(electiveList);
            bankContent.appendChild(electivesEl);
        }
    };

    const generatePeriodOptions = (selectedPeriod) => {
        let optionsHtml = '<option value="">Seleccionar periodo</option>';
        const currentYear = new Date().getFullYear();
        for (let year = 2018; year <= currentYear + 5; year++) {
            const period1 = `${year}-1`;
            const period2 = `${year}-2`;
            optionsHtml += `<option value="${period1}" ${selectedPeriod === period1 ? 'selected' : ''}>${period1}</option>`;
            optionsHtml += `<option value="${period2}" ${selectedPeriod === period2 ? 'selected' : ''}>${period2}</option>`;
        }
        return optionsHtml;
    };

    const renderSemesters = () => {
        const grid = document.getElementById('semesters-grid');
        grid.innerHTML = '';
        state.semesters.forEach(semester => {
            const semesterCol = document.createElement('div');
            semesterCol.id = `semester-${semester.id}`;
            semesterCol.className = 'semester-column p-4 rounded-lg space-y-2';
            semesterCol.dataset.id = semester.id;
            semesterCol.style.backgroundColor = semester.color;
            
            const header = document.createElement('div');
            header.className = 'semester-header';
            header.innerHTML = `
                <h3 class="text-lg font-bold text-accent">Semestre ${semester.id}</h3>
                <div class="flex items-center gap-2">
                    <select class="semester-period-selector bg-tertiary border border-color text-xs rounded p-1" data-id="${semester.id}">
                        ${generatePeriodOptions(semester.period)}
                    </select>
                    <input type="color" class="semester-color-picker" data-id="${semester.id}" value="${semester.color}" title="Cambiar color del semestre">
                </div>
            `;
            semesterCol.appendChild(header);
            
            state.subjects.filter(s => s.location === semester.id).forEach(s => semesterCol.appendChild(createSubjectCard(s)));
            
            semesterCol.addEventListener('dragover', handleDragOver);
            semesterCol.addEventListener('drop', handleDrop);
            semesterCol.querySelector('.semester-color-picker').addEventListener('input', handleColorChange);
            semesterCol.querySelector('.semester-period-selector').addEventListener('change', handlePeriodChange);
            grid.appendChild(semesterCol);
        });
    };

    const updateStats = () => {
        const completedSubjects = state.subjects.filter(s => s.completed);
        const basicCredits = completedSubjects.filter(s => !s.isElective && s.cycle === 'Básico').reduce((sum, s) => sum + s.credits, 0);
        const profCredits = completedSubjects.filter(s => !s.isElective && s.cycle === 'Profesional').reduce((sum, s) => sum + s.credits, 0);
        
        const fgCredits = completedSubjects.filter(s => s.isElective && s.electiveType === 'fg').reduce((sum, s) => sum + s.credits, 0);
        const profElectivesCredits = completedSubjects.filter(s => s.isElective && s.electiveType === 'prof').reduce((sum, s) => sum + s.credits, 0);
        
        const totalCredits = basicCredits + profCredits + fgCredits + profElectivesCredits;

        const updateStat = (id, current, total) => {
            const numEl = document.getElementById(id);
            const barEl = document.getElementById(`${id}-bar`);
            if(numEl && barEl) {
                numEl.textContent = `${current} / ${total}`;
                barEl.style.width = total > 0 ? `${(current / total) * 100}%` : '0%';
            }
        };
        updateStat('total-credits', totalCredits, 140);
        updateStat('basic-cycle-credits', basicCredits, 49);
        updateStat('professional-cycle-credits', profCredits, 57);
        updateStat('fg-credits', fgCredits, 17);
        updateStat('prof-electives-credits', profElectivesCredits, 17);
    };
    
    // --- MANEJADORES DE EVENTOS ---
    const handleColorChange = (e) => {
        const semesterId = parseInt(e.target.dataset.id);
        const newColor = e.target.value;
        const semester = state.semesters.find(s => s.id === semesterId);
        if(semester) {
            semester.color = newColor;
            document.getElementById(`semester-${semesterId}`).style.backgroundColor = newColor;
            saveState();
        }
    };

    const handlePeriodChange = (e) => {
        const semesterId = parseInt(e.target.dataset.id);
        const newPeriod = e.target.value;
        const semester = state.semesters.find(s => s.id === semesterId);
        if (semester) {
            semester.period = newPeriod;
            saveState();
        }
    };

    const toggleSubjectComplete = (subjectId) => {
        const subject = state.subjects.find(s => s.id === subjectId);
        if (!subject) return;

        if (subject.location === 'bank') {
            alert('Debes arrastrar la materia a un semestre para poder marcarla como cursada.');
            return;
        }

        if (subject.completed) {
            const dependents = state.subjects.filter(s => s.prerequisites.includes(subjectId) && s.completed);
            if (dependents.length > 0) {
                alert(`No puedes desmarcar esta materia. Las siguientes materias dependen de ella: ${dependents.map(d => d.name).join(', ')}`);
                return;
            }
            subject.completed = false;
        } else {
            const prereqsMet = subject.prerequisites.every(pId => state.subjects.find(s => s.id === pId)?.completed);
            if (!prereqsMet) {
                alert('Debes completar los prerrequisitos primero.');
                return;
            }
            subject.completed = true;
        }
        render();
    };

    document.getElementById('add-semester-btn').addEventListener('click', () => {
        state.semesters.push({ id: state.nextSemesterId++, subjects: [], color: defaultSemesterColor(), period: '' });
        render();
    });
    
    // Drag and Drop
    let draggedElementId = null;
    function handleDragStart(e) { draggedElementId = e.target.dataset.id; e.target.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; }
    function handleDragEnd(e) { e.target.classList.remove('dragging'); draggedElementId = null; }
    function handleDragOver(e) {
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        const dropTarget = e.target.closest('.semester-column, [id^="bank-"]');
        if (dropTarget) {
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            dropTarget.classList.add('drag-over');
        }
    }
    function handleDrop(e) {
        e.preventDefault();
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        const dropTarget = e.target.closest('.semester-column, [id^="bank-"]');
        if (!dropTarget || !draggedElementId) return;
        const subject = state.subjects.find(s => s.id === draggedElementId);
        if (!subject) return;
        const targetId = dropTarget.id;
        if (targetId.startsWith('semester-')) subject.location = parseInt(dropTarget.dataset.id);
        else if (targetId.startsWith('bank-')) subject.location = 'bank';
        render();
    }
    
    // Lógica de Electivas
    const addElective = (electiveData, type) => {
        const newElective = {
            id: `elective-${state.nextElectiveId++}`,
            name: electiveData.name,
            credits: electiveData.credits,
            cycle: 'Electiva',
            area: 'Electivas',
            prerequisites: [],
            location: 'bank',
            completed: false,
            isElective: true,
            electiveType: type
        };
        state.subjects.push(newElective);
        render();
    };

    const deleteElective = (subjectId) => {
        const subjectIndex = state.subjects.findIndex(s => s.id === subjectId);
        if (subjectIndex > -1) {
            state.subjects.splice(subjectIndex, 1);
            render();
        }
    };

    document.getElementById('reset-button').addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres reiniciar todo tu progreso? Esta acción no se puede deshacer.')) {
            localStorage.removeItem('univalleDisenoPlannerV10');
            localStorage.removeItem('userProfilePic');
            localStorage.removeItem('userBgImage');
            state.subjects = initialSubjects.map(s => ({ ...s, location: 'bank', completed: false, isElective: false }));
            state.semesters = [];
            state.nextSemesterId = 1;
            state.nextElectiveId = 1;
            location.reload();
        }
    });

    // Lógica de Tema
    const themeToggle = document.getElementById('theme-toggle');
    const setAppTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('univalleTheme', theme);
        themeToggle.checked = theme === 'light';
    };
    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'light' : 'dark';
        setAppTheme(newTheme);
        state.semesters.forEach(s => {
            if (s.color === '#212121' || s.color === '#ffffff') s.color = defaultSemesterColor();
        });
        render();
    });

    // Lógica de Modales
    const openModal = (modal) => modal.classList.add('visible');
    const closeModal = (modal) => modal.classList.remove('visible');

    const welcomeModal = document.getElementById('welcome-modal');
    const closeWelcomeBtn = document.getElementById('close-welcome-modal-btn');
    if (!localStorage.getItem('hasVisitedPlanner')) {
        openModal(welcomeModal);
        localStorage.setItem('hasVisitedPlanner', 'true');
    }
    closeWelcomeBtn.addEventListener('click', () => closeModal(welcomeModal));

    const pdfModal = document.getElementById('pdf-modal');
    const openPdfModalBtn = document.getElementById('open-pdf-modal-btn');
    const closePdfModalBtn = document.getElementById('close-pdf-modal-btn');
    const pdfInfoForm = document.getElementById('pdf-info-form');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    openPdfModalBtn.addEventListener('click', () => openModal(pdfModal));
    closePdfModalBtn.addEventListener('click', () => closeModal(pdfModal));
    
    pdfInfoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const studentName = document.getElementById('student-name').value;
        const studentId = document.getElementById('student-id').value;
        closeModal(pdfModal);
        generatePDF(studentName, studentId);
    });
    
    // Modal de Electivas
    const electiveModal = document.getElementById('elective-modal');
    const openFgElectiveBtn = document.getElementById('open-fg-elective-modal-btn');
    const openProfElectiveBtn = document.getElementById('open-prof-elective-modal-btn');
    const closeElectiveBtn = document.getElementById('close-elective-modal-btn');
    const catalogList = document.getElementById('elective-catalog-list');
    const searchInput = document.getElementById('elective-search');
    const customForm = document.getElementById('add-custom-elective-form');
    let currentElectiveType = 'fg';

    const populateCatalog = (type) => {
        const list = type === 'fg' ? predefinedFGElectives : predefinedProfElectives;
        catalogList.innerHTML = '';
        const searchTerm = searchInput.value.toLowerCase();
        list
            .filter(elective => elective.name.toLowerCase().includes(searchTerm) || elective.id.toLowerCase().includes(searchTerm))
            .forEach(elective => {
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center p-2 bg-tertiary rounded-md';
            item.innerHTML = `
                <div>
                    <p class="font-semibold">${elective.name}</p>
                    <p class="text-xs text-secondary">${elective.id} - ${elective.credits} créditos</p>
                </div>
                <button class="btn-primary text-sm px-3 py-1 rounded-md">Añadir</button>
            `;
            item.querySelector('button').addEventListener('click', () => {
                addElective({ name: elective.name, credits: elective.credits }, currentElectiveType);
                closeModal(electiveModal);
            });
            catalogList.appendChild(item);
        });
    };

    openFgElectiveBtn.addEventListener('click', () => {
        currentElectiveType = 'fg';
        document.getElementById('elective-modal-title').textContent = 'Seleccionar Electiva de Formación General';
        populateCatalog('fg');
        openModal(electiveModal);
    });

    openProfElectiveBtn.addEventListener('click', () => {
        currentElectiveType = 'prof';
         document.getElementById('elective-modal-title').textContent = 'Seleccionar Electiva Profesional';
        populateCatalog('prof');
        openModal(electiveModal);
    });

    closeElectiveBtn.addEventListener('click', () => closeModal(electiveModal));
    searchInput.addEventListener('input', () => populateCatalog(currentElectiveType));

    customForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('custom-elective-name').value;
        const credits = parseInt(document.getElementById('custom-elective-credits').value);
        addElective({ name, credits }, currentElectiveType);
        closeModal(electiveModal);
        e.target.reset();
    });

    // Pestañas en el Modal
    const tabs = document.querySelectorAll('.modal-tab');
    const tabContents = document.querySelectorAll('.modal-tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.id.replace('tab-', 'content-');
            tabContents.forEach(c => {
                c.classList.remove('active');
                if (c.id === target) {
                    c.classList.add('active');
                }
            });
        });
    });


    // Lógica de Personalización
    const profilePicContainer = document.getElementById('profile-pic-container');
    const profilePicUpload = document.getElementById('profile-pic-upload');
    const profilePic = document.getElementById('profile-pic');
    const customizeBtn = document.getElementById('customize-btn');
    const bgUpload = document.getElementById('bg-upload');

    profilePicContainer.addEventListener('click', () => profilePicUpload.click());
    customizeBtn.addEventListener('click', () => bgUpload.click());

    const handleFileUpload = (file, storageKey, callback) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            localStorage.setItem(storageKey, dataUrl);
            callback(dataUrl);
        };
        reader.readAsDataURL(file);
    };

    profilePicUpload.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0], 'userProfilePic', (url) => {
                profilePic.src = url;
            });
        }
    });

    bgUpload.addEventListener('change', (e) => {
         if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0], 'userBgImage', (url) => {
                document.body.style.backgroundImage = `url(${url})`;
            });
        }
    });

    const loadPersonalization = () => {
        const savedPic = localStorage.getItem('userProfilePic');
        const savedBg = localStorage.getItem('userBgImage');
        if (savedPic) {
            profilePic.src = savedPic;
        }
        if (savedBg) {
            document.body.style.backgroundImage = `url(${savedBg})`;
        }
    };

    // --- GENERACIÓN DE PDF ---
    function generatePDF(studentName, studentId) {
        loadingText.textContent = 'Generando PDF...';
        openModal(loadingOverlay);

        const reportElement = document.createElement('div');
        reportElement.style.padding = '20px';
        reportElement.style.fontFamily = 'Arial, sans-serif';
        reportElement.style.color = '#333';
        
        const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

        let html = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="font-size: 24px; margin: 0;">Reporte de Progreso Académico</h1>
                <p style="font-size: 16px; margin: 5px 0;">Diseño Industrial - Universidad del Valle</p>
            </div>
            <div style="margin-bottom: 20px;">
                <p><strong>Estudiante:</strong> ${studentName}</p>
                <p><strong>Código:</strong> ${studentId}</p>
                <p><strong>Fecha de generación:</strong> ${date}</p>
            </div>
            <h2 style="font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 15px;">Resumen de Créditos</h2>
        `;

        const completedSubjects = state.subjects.filter(s => s.completed);
        const basicCredits = completedSubjects.filter(s => !s.isElective && s.cycle === 'Básico').reduce((sum, s) => sum + s.credits, 0);
        const profCredits = completedSubjects.filter(s => !s.isElective && s.cycle === 'Profesional').reduce((sum, s) => sum + s.credits, 0);
        const fgCredits = completedSubjects.filter(s => s.isElective && s.electiveType === 'fg').reduce((sum, s) => sum + s.credits, 0);
        const profElectivesCredits = completedSubjects.filter(s => s.isElective && s.electiveType === 'prof').reduce((sum, s) => sum + s.credits, 0);
        const totalCredits = basicCredits + profCredits + fgCredits + profElectivesCredits;

        html += `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="background-color: #eee;">
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Componente</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Créditos</th>
                </tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;">Ciclo Básico</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${basicCredits} / 49</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;">Ciclo Profesional</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${profCredits} / 57</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;">Formación General</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${fgCredits} / 17</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;">Electivas Profesionales</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${profElectivesCredits} / 17</td></tr>
                <tr style="background-color: #eee; font-weight: bold;"><td style="padding: 8px; border: 1px solid #ddd;">TOTAL</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${totalCredits} / 140</td></tr>
            </table>
        `;

        html += `<h2 style="font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 15px;">Plan de Carrera</h2>`;
        state.semesters.forEach(semester => {
            const periodText = semester.period ? `(${semester.period})` : '';
            html += `<h3 style="font-size: 18px; margin-top: 20px; margin-bottom: 10px;">Semestre ${semester.id} ${periodText}</h3>`;
            const subjectsInSemester = state.subjects.filter(s => s.location === semester.id);
            if (subjectsInSemester.length > 0) {
                html += `<ul style="list-style-type: none; padding: 0;">`;
                subjectsInSemester.forEach(subject => {
                    html += `<li style="padding: 5px; border-bottom: 1px solid #eee;">${subject.name} (${subject.credits} C) ${subject.completed ? '<strong>- Cursada</strong>' : ''}</li>`;
                });
                html += `</ul>`;
            } else {
                html += `<p>No hay materias planeadas para este semestre.</p>`;
            }
        });

        reportElement.innerHTML = html;

        const opt = {
            margin: 10,
            filename: `Reporte_Progreso_${studentName.replace(/\s/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().from(reportElement).set(opt).save().then(() => {
            closeModal(loadingOverlay);
        });
    }
    
    // --- PARSER DE TABULADO ---
    function parseTabulado(text) {
        const lines = text.split('\n');
        const results = [];

        lines.forEach(line => {
            const cleaned = line.trim();
            if (!cleaned) return;

            const parts = cleaned.split(/\t|\s{2,}/).filter(part => part.trim() !== '');
            if (parts.length < 9) return;

            const codigo = parts[0].trim();
            const nombre = parts[3].trim();
            const creditos = parseInt(parts[7]);
            const calificacion = parseFloat(parts[8].replace(',', '.')) || 0;
            const funcion = parts[5].trim();
            const cancelada = line.includes('CANCELACIÓN') || isNaN(calificacion) || calificacion === 0;

            let tipo = 'desconocido';
            if (funcion === 'AB') tipo = 'básica';
            else if (funcion === 'AP') tipo = 'profesional';
            else if (funcion === 'EC' || funcion === 'LCO') tipo = 'fg';
            else if (funcion === 'EP') tipo = 'prof';

            if (codigo && nombre && !isNaN(creditos)) {
                results.push({
                    id: codigo,
                    name: nombre,
                    credits: creditos,
                    grade: calificacion,
                    type: tipo,
                    completed: !cancelada && calificacion >= 3.0,
                    canceled: cancelada
                });
            }
        });
        return results;
    }

    // --- ORGANIZADOR DESDE TABULADO (LÓGICA MEJORADA) ---
    function organizeFromTabulado(tabuladoData) {
        // 1. Crear un mapa de materias aprobadas del tabulado para búsqueda rápida.
        const approvedSubjectsMap = new Map();
        tabuladoData.forEach(item => {
            if (item.completed) {
                approvedSubjectsMap.set(item.id, item);
            }
        });
    
        // 2. Usar una copia fresca del plan de estudios como base.
        let newSubjectsList = initialSubjects.map(s => ({ ...s, location: 'bank', completed: false, isElective: false }));
    
        // 3. Mantener las electivas personalizadas que el usuario ya haya creado.
        const customElectives = state.subjects.filter(s => s.isElective && s.id.startsWith('elective-'));
        newSubjectsList.push(...customElectives);
    
        // 4. Actualizar el estado de las materias basándose en el tabulado.
        newSubjectsList.forEach(subject => {
            if (approvedSubjectsMap.has(subject.id)) {
                subject.completed = true;
                approvedSubjectsMap.delete(subject.id); // Remover para no añadirla de nuevo
            }
        });
    
        // 5. Añadir electivas oficiales aprobadas del tabulado que no estaban en la lista.
        approvedSubjectsMap.forEach(item => {
            // Evitar duplicados si ya existe
            if (!newSubjectsList.some(s => s.id === item.id)) {
                const newElective = {
                    id: item.id,
                    name: item.name,
                    credits: item.credits,
                    cycle: 'Electiva',
                    area: item.type === 'fg' ? 'Formación General' : 'Electivas Profesionales',
                    prerequisites: [],
                    location: 'bank', // Se moverá a un semestre en el siguiente paso
                    completed: true,
                    isElective: true,
                    electiveType: item.type
                };
                newSubjectsList.push(newElective);
            }
        });
    
        // 6. Actualizar la lista de materias del estado principal.
        state.subjects = newSubjectsList;
    
        // 7. Organizar las materias completadas en semestres.
        const completedSubjects = state.subjects.filter(s => s.completed);
        state.semesters = [];
        state.nextSemesterId = 1; 
    
        if (completedSubjects.length > 0) {
            let currentSemesterId = 1;
            let currentSemesterCredits = 0;
            
            state.semesters.push({
                id: currentSemesterId,
                color: defaultSemesterColor(),
                period: ''
            });
    
            const sortedCompleted = [...completedSubjects].sort((a, b) => {
                const order = { 'Básico': 1, 'Profesional': 2, 'Electiva': 3 };
                return (order[a.cycle] || 4) - (order[b.cycle] || 4);
            });
    
            sortedCompleted.forEach(subject => {
                if (currentSemesterCredits > 0 && currentSemesterCredits + subject.credits > 18) {
                    currentSemesterId++;
                    currentSemesterCredits = 0;
                    state.semesters.push({
                        id: currentSemesterId,
                        color: defaultSemesterColor(),
                        period: ''
                    });
                }
                subject.location = currentSemesterId;
                currentSemesterCredits += subject.credits;
            });
            state.nextSemesterId = currentSemesterId + 1;
        }
    
        // 8. Las materias no completadas se quedarán en el banco por defecto. Renderizar el estado actualizado.
        saveState();
        render();
    }
    
    // --- EVENT LISTENERS DEL MODAL DE TABULADO ---
    const tabuladoOrganizeBtn = document.getElementById('tabulado-organize-btn');
    const organizeModal = document.getElementById('organize-modal');
    const closeOrganizeModalBtn = document.getElementById('close-organize-modal-btn');
    const processTabuladoBtn = document.getElementById('process-tabulado-btn');
    const organizeError = document.getElementById('organize-error');

    tabuladoOrganizeBtn.addEventListener('click', () => openModal(organizeModal));
    closeOrganizeModalBtn.addEventListener('click', () => closeModal(organizeModal));

    processTabuladoBtn.addEventListener('click', () => {
        const tabuladoText = document.getElementById('tabulado-input').value;
        if (!tabuladoText) {
            organizeError.textContent = 'Por favor, pega tu tabulado';
            organizeError.style.display = 'block';
            return;
        }

        try {
            const parsedData = parseTabulado(tabuladoText);
            if (parsedData.length === 0) {
                organizeError.textContent = 'No se encontraron materias. Verifica el formato.';
                organizeError.style.display = 'block';
                return;
            }

            organizeError.style.display = 'none';
            closeModal(organizeModal);
            organizeFromTabulado(parsedData);
            alert(`Se organizaron ${parsedData.filter(item => item.completed).length} materias aprobadas.`);
        } catch (error) {
            console.error("Error al procesar tabulado:", error);
            organizeError.textContent = 'Error al procesar: ' + error.message;
            organizeError.style.display = 'block';
        }
    });

    // --- INICIALIZACIÓN ---
    const savedTheme = localStorage.getItem('univalleTheme') || 'dark';
    setAppTheme(savedTheme);
    loadState();
    loadPersonalization();
    render();
});

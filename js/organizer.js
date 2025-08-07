// js/organizer.js

((App) => {
    App.organizer = {
        init() {}, // Placeholder for future use if needed

        parseSiraHistory(siraText) {
            const pensumData = App.state.getPensumData();
            const subjectCodes = new Set(pensumData.map(s => s.id));
            const approvedCodes = new Set();
            
            const codeRegex = /[0-9]{6,7}[A-Z]/g;
            const matches = siraText.match(codeRegex);

            if (matches) {
                matches.forEach(code => {
                    if (subjectCodes.has(code)) approvedCodes.add(code);
                });
            }
            return Array.from(approvedCodes);
        },

        autoOrganizePlan() {
            const { semesters, completedSubjects } = App.state.getPlannerState();
            const pensumData = App.state.getPensumData();
            
            const subjectsInPlan = new Set(semesters.flatMap(sem => sem.subjects));
            const completedSet = new Set(completedSubjects);
            const subjectsToOrganize = pensumData.filter(
                s => !subjectsInPlan.has(s.id) && !completedSet.has(s.id)
            );

            subjectsToOrganize.forEach(subject => {
                for (let i = 0; i < semesters.length; i++) {
                    const semesterId = semesters[i].id;
                    const validation = App.validation.canMoveToSemester(subject.id, semesterId);
                    if (validation.isValid) {
                        semesters[i].subjects.push(subject.id);
                        break;
                    }
                }
            });
            
            App.state.saveState();
            App.ui.renderFullUI();
            App.ui.showNotification("Plan organizado automáticamente.", "success");
        }
    };
})(window.App);

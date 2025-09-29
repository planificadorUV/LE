// A simple, lightweight testing framework to run in the browser.
const TestSuite = {
    tests: [],
    run: function() {
        let passes = 0;
        let fails = 0;
        const resultsList = document.getElementById('results');

        // Mock functions that would normally interact with Firebase or the DOM
        globalThis.showNotification = () => {};

        this.tests.forEach(({ description, fn }) => {
            const li = document.createElement('li');
            li.classList.add('test');
            try {
                fn();
                li.classList.add('pass');
                li.innerHTML = `<strong>✅ PASS:</strong> ${description}`;
                passes++;
            } catch (e) {
                li.classList.add('fail');
                li.innerHTML = `<strong>❌ FAIL:</strong> ${description} <div class="fail-details">${e.stack}</div>`;
                fails++;
                console.error(`Test failed: ${description}`, e);
            }
            resultsList.appendChild(li);
        });

        const summary = document.getElementById('summary');
        summary.textContent = `Test Summary: ${passes} passed, ${fails} failed.`;
        summary.classList.add(fails > 0 ? 'fail' : 'pass');
    },
    test: function(description, fn) {
        this.tests.push({ description, fn });
    }
};

// Assertion library to check test outcomes.
const assert = {
    equal: function(actual, expected) {
        if (actual !== expected) {
            throw new Error(`Assertion failed: Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
        }
    },
    deepEqual: function(actual, expected) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`Assertion failed: Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
        }
    },
    isTrue: function(value) {
        if (value !== true) {
            throw new Error(`Assertion failed: Expected true but got ${value}`);
        }
    },
    isFalse: function(value) {
        if (value !== false) {
            throw new Error(`Assertion failed: Expected false but got ${value}`);
        }
    }
};

// Run the tests after the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    // Placeholder test to ensure the runner is working.
    TestSuite.test('Test runner should be set up correctly', () => {
        assert.equal(1 + 1, 2);
    });

    // --- All other tests will be added here ---

    // --- calculateStats Tests ---
    TestSuite.test('calculateStats: should handle an empty plan', () => {
        const plan = { subjects: [] };
        const stats = calculateStats(plan);
        assert.deepEqual(stats, {
            totalSubjects: 0,
            completedSubjects: 0,
            totalCredits: 0,
            completedCredits: 0,
            completionPercentage: 0,
            englishTotal: 0,
            englishCompleted: 0
        });
    });

    TestSuite.test('calculateStats: should handle a plan with no completed subjects', () => {
        const plan = {
            subjects: [
                { id: '1', credits: 4, completed: false },
                { id: '2', credits: 3, completed: false }
            ]
        };
        const stats = calculateStats(plan);
        assert.equal(stats.completedSubjects, 0);
        assert.equal(stats.completedCredits, 0);
        assert.equal(stats.completionPercentage, 0);
    });

    TestSuite.test('calculateStats: should correctly calculate stats for a plan with mixed subjects', () => {
        const plan = {
            subjects: [
                { id: '1', credits: 4, completed: true, type: 'AB' },
                { id: '2', credits: 4, completed: true, type: 'AB' },
                { id: '3', credits: 4, completed: false, type: 'AP' },
                { id: '4', credits: 2, completed: true, type: 'english' },
                { id: '5', credits: 2, completed: false, type: 'english' },
                { id: '6', credits: 3, completed: true, type: 'AB' }
            ]
        };
        const stats = calculateStats(plan);
        assert.equal(stats.totalSubjects, 6);
        assert.equal(stats.completedSubjects, 4);
        assert.equal(stats.totalCredits, 19);
        assert.equal(stats.completedCredits, 13);
        assert.equal(stats.completionPercentage, 68); // Math.round((13 / 19) * 100)
    });

    TestSuite.test('calculateStats: should correctly count English subjects', () => {
        const plan = {
            subjects: [
                { id: '1', credits: 2, completed: true, type: 'english' },
                { id: '2', credits: 2, completed: false, type: 'english' },
                { id: '3', credits: 2, completed: true, category: 'english' } // Test alternate property
            ]
        };
        const stats = calculateStats(plan);
        assert.equal(stats.englishTotal, 3);
        assert.equal(stats.englishCompleted, 2);
    });

    TestSuite.test('calculateStats: should handle a plan with all subjects completed', () => {
        const plan = {
            subjects: [
                { id: '1', credits: 4, completed: true },
                { id: '2', credits: 3, completed: true }
            ]
        };
        const stats = calculateStats(plan);
        assert.equal(stats.completedSubjects, 2);
        assert.equal(stats.totalSubjects, 2);
        assert.equal(stats.completedCredits, 7);
        assert.equal(stats.totalCredits, 7);
        assert.equal(stats.completionPercentage, 100);
    });

    // --- canTakeSubject Tests ---
    TestSuite.test('canTakeSubject: should return true for a subject with no prerequisites', () => {
        const subject = { id: 'CS101', prerequisites: [] };
        const plan = { subjects: [] };
        assert.isTrue(canTakeSubject(subject, plan));
    });

    TestSuite.test('canTakeSubject: should return true when prerequisites are met', () => {
        const subject = { id: 'CS202', prerequisites: ['CS101'] };
        const plan = {
            subjects: [
                { id: 'CS101', completed: true },
                { id: 'CS202', prerequisites: ['CS101'] }
            ]
        };
        assert.isTrue(canTakeSubject(subject, plan));
    });

    TestSuite.test('canTakeSubject: should return false when prerequisites are not met', () => {
        const subject = { id: 'CS202', prerequisites: ['CS101'] };
        const plan = {
            subjects: [
                { id: 'CS101', completed: false },
                { id: 'CS202', prerequisites: ['CS101'] }
            ]
        };
        assert.isFalse(canTakeSubject(subject, plan));
    });

    TestSuite.test('canTakeSubject: should handle multiple prerequisites correctly', () => {
        const subject = { id: 'CS303', prerequisites: ['CS101', 'MA201'] };
        const plan = {
            subjects: [
                { id: 'CS101', completed: true },
                { id: 'MA201', completed: false },
                { id: 'CS303', prerequisites: ['CS101', 'MA201'] }
            ]
        };
        assert.isFalse(canTakeSubject(subject, plan));

        // Now with both prerequisites met
        plan.subjects[1].completed = true;
        assert.isTrue(canTakeSubject(subject, plan));
    });

    // --- parseSiraData Tests ---
    TestSuite.test('parseSiraData: should return an empty array for empty input', () => {
        const data = '';
        assert.deepEqual(parseSiraData(data), []);
    });

    TestSuite.test('parseSiraData: should correctly parse valid data with grades >= 3.0', () => {
        const data = `
            750001M CALCULO DIFERENCIAL 4.5
            750002M CALCULO INTEGRAL 3.0
        `;
        const expected = [
            { code: '750001M', name: 'CALCULO DIFERENCIAL', grade: 4.5 },
            { code: '750002M', name: 'CALCULO INTEGRAL', grade: 3.0 }
        ];
        assert.deepEqual(parseSiraData(data), expected);
    });

    TestSuite.test('parseSiraData: should ignore subjects with grades < 3.0', () => {
        const data = `
            750001M CALCULO DIFERENCIAL 4.0
            750003M ALGEBRA LINEAL 2.9
            750004M FISICA 1 2.5
        `;
        const expected = [
            { code: '750001M', name: 'CALCULO DIFERENCIAL', grade: 4.0 }
        ];
        assert.deepEqual(parseSiraData(data), expected);
    });

    TestSuite.test('parseSiraData: should handle the alternate SIRA format', () => {
        const data = '750012C INTRODUCCION A LA ING. 4   4.0';
        const expected = [
            { code: '750012C', name: 'INTRODUCCION A LA ING.', grade: 4.0 }
        ];
        assert.deepEqual(parseSiraData(data), expected);
    });

    TestSuite.test('parseSiraData: should handle mixed and malformed data', () => {
        const data = `
            This is a malformed line.
            750001M CALCULO DIFERENCIAL 3.5
            Another bad line
            750003M ALGEBRA LINEAL 2.0
            750012C INTRODUCCION A LA ING. 4   4.0
        `;
        const expected = [
            { code: '750001M', name: 'CALCULO DIFERENCIAL', grade: 3.5 },
            { code: '750012C', name: 'INTRODUCCION A LA ING.', grade: 4.0 }
        ];
        assert.deepEqual(parseSiraData(data), expected);
    });

    TestSuite.run();
});
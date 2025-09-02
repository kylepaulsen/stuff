import { ui, appStorage } from './utils.js';
import { parseExercises, setExercises } from './workoutEditor.js';
import { say } from './textToSpeech.js';

const allSavedWorkouts = appStorage.savedWorkouts || [];

const defaultWorkoutStr = `
    Jumping Jacks, 30
    Rest, 10
    Wall Sit, 30
    Rest, 10
    Push ups, 30
    Rest, 10
    Crunches, 30
    Rest, 10
    Step ups, 30
    Rest, 10
    Squats, 30
    Rest, 10
    Triceps Dips, 30
    Rest, 10
    Plank, 30
    Rest, 10
    High Knees Running In Place, 30
    Rest, 10
    Lunge, 30
    Rest, 10
    Push up and Rotation, 30
    Rest, 10
    Side Plank, 30
`.trim().split('\n').map(e => e.trim()).join('\n');

const defaultWorkout = { name: '7 Minute Workout', exercises: parseExercises(defaultWorkoutStr), default: true };

const populateSavedWorkouts = () => {
    ui.savedWorkouts.innerHTML = '';
    const savedWorkoutTemplate = `
        <div class="flex gap row">
            <div class="flex1">
                <button class="savedWorkoutName row ellipsis"></button>
            </div>
            <button class="deleteWorkoutBtn auto">Delete</button>
        </div>
    `;
    const createWorkoutBtns = (workout, idx) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = savedWorkoutTemplate;
        const savedWorkoutEl = tempDiv.children[0];
        const saveWorkoutBtn = savedWorkoutEl.querySelector('.savedWorkoutName');
        saveWorkoutBtn.textContent = workout.name;
        if (idx === undefined) {
            saveWorkoutBtn.dataset.workoutId = 'default';
            savedWorkoutEl.querySelector('.deleteWorkoutBtn').remove();
        } else {
            savedWorkoutEl.dataset.workoutId = idx;
            saveWorkoutBtn.dataset.workoutId = idx;
        }
        ui.savedWorkouts.appendChild(savedWorkoutEl);
    };
    allSavedWorkouts.forEach(createWorkoutBtns);
    createWorkoutBtns(defaultWorkout);
};
populateSavedWorkouts();

const saveWorkouts = () => {
    appStorage.savedWorkouts = allSavedWorkouts;
    populateSavedWorkouts();
};

const saveWorkout = (name) => {
    const exercises = parseExercises();
    if (exercises.length && name) {
        allSavedWorkouts.unshift({
            name,
            exercises
        });

        ui.workoutName.textContent = name;
        appStorage.lastWorkoutName = name;
        saveWorkouts();
    }
};

const loadWorkout = (id) => {
	const workoutToLoad = allSavedWorkouts[id] || defaultWorkout;
	ui.workoutName.textContent = workoutToLoad.name;
	setExercises(workoutToLoad.exercises);
	ui.workoutNameInput.value = workoutToLoad.name;
	appStorage.lastWorkoutName = workoutToLoad.name;
	appStorage.lastWorkout = ui.exercises.innerText;
};

setExercises(parseExercises(appStorage.lastWorkout || defaultWorkoutStr));

ui.savedWorkouts.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('deleteWorkoutBtn')) {
        const lastDeleteSure = ui.savedWorkouts.querySelector('.deleteSure');
        if (target.classList.contains('deleteSure')) {
            const id = parseInt(target.parentNode.dataset.workoutId);
            allSavedWorkouts.splice(id, 1);
            saveWorkouts();
        } else {
            target.classList.add('deleteSure');
            target.textContent = 'You sure?';
            target.disabled = true;
            setTimeout(() => {
                target.disabled = false;
            }, 500);
        }
        if (lastDeleteSure) {
            lastDeleteSure.classList.remove('deleteSure');
            lastDeleteSure.textContent = 'Delete';
        }
    } else if (target.classList.contains('savedWorkoutName')) {
        if (target.dataset.workoutId === 'default') {
            loadWorkout();
        } else {
            const id = parseInt(target.dataset.workoutId);
            loadWorkout(id);
        }
    }
});

ui.settingsBtn.addEventListener('click', () => {
	// activeDialog = ui.settingsDialog;
	ui.settingsDialog.showModal();
});

ui.closeSettingsDialogBtn.addEventListener('click', () => {
	ui.settingsDialog.close();
});

ui.settingsTabs.addEventListener('click', (e) => {
	const target = e.target;
	const tabId = target.dataset.tab;
	if (tabId) {
		ui.settingsTabs.querySelector('.active').classList.remove('active');
		target.classList.add('active');
		ui.settingsDialog.querySelector('.tab-content.active').classList.remove('active');
		ui[tabId].classList.add('active');
	}
});

const hideOverwriteWarning = () => {
	ui.saveWorkoutBtn.textContent = 'Save';
	ui.saveWorkoutBtn.dataset.overwrite = 'false';
	ui.saveWorkoutWarning.textContent = '';
};

ui.workoutNameInput.addEventListener('input', () => {
	ui.saveWorkoutBtn.disabled = ui.workoutNameInput.value.length === 0;
	hideOverwriteWarning();
});

ui.saveWorkoutBtn.addEventListener('click', () => {
	const newName = ui.workoutNameInput.value;
	const conflict = allSavedWorkouts.find(w => w.name.toLowerCase() === newName.toLowerCase() && !w.default);
	if (!conflict || ui.saveWorkoutBtn.dataset.overwrite === 'true') {
		hideOverwriteWarning();
		if (conflict) {
			allSavedWorkouts.splice(allSavedWorkouts.indexOf(conflict), 1);
		}
		saveWorkout(newName);
		ui.saveWorkoutBtn.textContent = 'Saved!';
		ui.saveWorkoutBtn.style.color = '#2e2';
		setTimeout(() => {
			if (ui.saveWorkoutBtn.textContent === 'Saved!') {
				ui.saveWorkoutBtn.textContent = 'Save';
			}
			ui.saveWorkoutBtn.removeAttribute('style');
		}, 1500);
	} else if (conflict) {
		ui.saveWorkoutWarning.textContent = 'This workout already exists. Overwrite?';
		ui.saveWorkoutBtn.dataset.overwrite = 'true';
		ui.saveWorkoutBtn.textContent = 'Overwrite';
	}
});

ui.voiceSelect.addEventListener('change', () => {
	say('Ready to workout?');
	appStorage.preferredVoice = ui.voiceSelect.options[ui.voiceSelect.selectedIndex].value;
});

ui.workoutNameInput.value = appStorage.lastWorkoutName || 'My Workout';

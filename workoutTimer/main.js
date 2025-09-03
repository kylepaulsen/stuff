import { ui, appStorage } from './utils.js';
import { primeSpeechSynthesis, say } from './textToSpeech.js';
import { parseExercises } from './workoutEditor.js';
import "./settings.js";

let wakeLock;
let exercises = [];
let currentExerciseIdx = 0;
let timerTimestamp;
let timerLength;
let pauseStartTime;
let pauseTime;
let lastSecondsLeft;
const updateTime = () => {
	if (pauseStartTime) {
		return;
	}
	const secondsLeft = timerLength - Math.floor((Date.now() - timerTimestamp - pauseTime) / 1000);
	if (secondsLeft === lastSecondsLeft) {
		return;
	}
	lastSecondsLeft = secondsLeft;
	// From this point, secondsLeft has gone down by 1.
	if (secondsLeft < 0) {
		nextExercise();
		return;
	}
	ui.currentExerciseTime.textContent = secondsLeft;
	const currentExercise = exercises[currentExerciseIdx];
	const nextUpExercise = exercises[currentExerciseIdx + 1];

	const isExercise = currentExercise.name.toLowerCase() !== 'rest';
	const nextIsRest = nextUpExercise && nextUpExercise.name.toLowerCase() === 'rest';
	if (secondsLeft === Math.floor(currentExercise.seconds / 2) && isExercise && currentExercise.seconds > 7) {
		say('Halfway done!');
	} else if (secondsLeft === 4) {
		primeSpeechSynthesis();
	} else if (secondsLeft < 4 && secondsLeft > 0) {
		say(secondsLeft, 1.5);
	} else if (secondsLeft === 0) {
		if (currentExerciseIdx === 0) {
			say('Start Workout');
		} else {
			if (currentExerciseIdx >= exercises.length - 1) {
				say('Workout complete!');
				stopWorkout();
			} else if (nextIsRest) {
				let toSay = 'Now rest!';
				if (exercises[currentExerciseIdx + 2]) {
					toSay += ` Up next, ${exercises[currentExerciseIdx + 2].name}`;
				}
				say(toSay);
			} else {
				say('Go!');
			}
		}
	}
};

const workerFunc = () => {
	const tickRate = 25;

	const tick = () => {
		postMessage('tick');
	};

	setInterval(tick, tickRate);
};

const worker = new Worker(((func) => {
	const src = '"use strict"; (' + func.toString() + ')();';
	const blob = new Blob([src], {type: 'text/javascript'});
	return window.URL.createObjectURL(blob);
})(workerFunc));

const nextExercise = () => {
	currentExerciseIdx++;
	const currentExercise = exercises[currentExerciseIdx];
	let nextUp = '';
	const nextExercise = exercises[currentExerciseIdx + 1];
	if (nextExercise && (currentExercise.name.toLowerCase() === 'rest' || currentExerciseIdx === 0)) {
		nextUp = ` (Next up: ${nextExercise.name})`;
	}
	if (currentExercise) {
		timerTimestamp = Date.now();
		pauseTime = 0;
		timerLength = currentExercise.seconds;
		const nameDiv = document.createElement('div');
		nameDiv.textContent = currentExercise.name;
		ui.currentExerciseName.innerHTML = '';
		ui.currentExerciseName.appendChild(nameDiv);
		if (nextUp) {
			const nextUpDiv = document.createElement('div');
			nextUpDiv.textContent = nextUp;
			ui.currentExerciseName.appendChild(nextUpDiv);
		}
		ui.currentExerciseTime.textContent = currentExercise.seconds;
	}
};

const requsetWakeLock = async () => {
	try {
		return await navigator.wakeLock.request('screen');
	} catch (err) {
		console.error(err, err.message);
	}
};

const unpauseWorkout = () => {
	if (ui.pauseWorkoutBtn.dataset.pause === 'true') {
		ui.pauseWorkoutBtn.dataset.pause = 'false';
		ui.pauseWorkoutBtn.textContent = 'Pause';
		pauseTime += Date.now() - pauseStartTime;
		pauseStartTime = undefined;
	}
};

const startWorkout = async () => {
	unpauseWorkout();
	pauseTime = 0;
	document.body.scrollTop = 0;
	ui.workoutDialog.showModal();

	exercises = parseExercises();

	wakeLock = await requsetWakeLock();
	exercises.unshift({name: 'Get Ready', seconds: 6});

	currentExerciseIdx = -1;
	nextExercise();

	ui.screenLockVid.style.display = 'block';
	ui.screenLockVid.play();
	say(`First up, ${exercises[1].name}`);
	worker.addEventListener('message', updateTime);
};

const stopWorkout = () => {
	if (wakeLock) {
		wakeLock.release();
		wakeLock = null;
	}
	ui.screenLockVid.style.display = 'none';
	ui.screenLockVid.pause();
	ui.workoutDialog.close();
	worker.removeEventListener('message', updateTime);
};

ui.startWorkoutBtn.addEventListener('click', startWorkout);
let stopWorkoutBtnTimeout;
ui.stopWorkoutBtn.addEventListener('click', () => {
	if (ui.stopWorkoutBtn.dataset.stop === 'true') {
		ui.stopWorkoutBtn.textContent = 'Stop';
		ui.stopWorkoutBtn.dataset.stop = 'false';
		clearTimeout(stopWorkoutBtnTimeout);
		stopWorkout();
	} else {
		ui.stopWorkoutBtn.dataset.stop = 'true';
		ui.stopWorkoutBtn.textContent = 'Confirm stop?';
		ui.stopWorkoutBtn.disabled = true;
		setTimeout(() => {
			ui.stopWorkoutBtn.disabled = false;
		}, 500);
		stopWorkoutBtnTimeout = setTimeout(() => {
			ui.stopWorkoutBtn.textContent = 'Stop';
			ui.stopWorkoutBtn.dataset.stop = 'false';
		}, 5000);
	}
});

window.addEventListener('mousedown', (e) => {
	if (!e.target.closest('dialog')) {
		const targetDialog = document.querySelector('dialog[open]');
		if (targetDialog && targetDialog.dataset.noclose === undefined) {
			targetDialog?.close();
		}
	}
}, true);

ui.pauseWorkoutBtn.addEventListener('click', () => {
	if (ui.pauseWorkoutBtn.dataset.pause !== 'true') {
		pauseStartTime = Date.now();
		ui.pauseWorkoutBtn.dataset.pause = 'true';
		ui.pauseWorkoutBtn.textContent = 'Resume';
	} else {
		unpauseWorkout();
	}
});

ui.screenOffBtn.addEventListener('click', () => {
	ui.blackOverlay.style.display = 'block';
	ui.workoutDialog.close();
	ui.blackOverlay.requestFullscreen();
});

ui.blackOverlay.addEventListener('click', () => {
	document.exitFullscreen();
	ui.blackOverlay.style.display = 'none';
	ui.workoutDialog.showModal();
});

const workoutDialogObserver = new MutationObserver(() => {
	if (!ui.workoutDialog.open && ui.blackOverlay.style.display !== 'block') {
		// if the browser forces the workout dialog to close, stop the workout
		stopWorkout();
	}
});
workoutDialogObserver.observe(ui.workoutDialog, { attributes: true, attributeFilter: ['open'] });

ui.workoutDialog.addEventListener('cancel', (e) => {
	// prevent accidental closing of the workout dialog
	// this may only work once, as browsers don't let you lock the user.
	e.preventDefault();
});

ui.workoutName.textContent = appStorage.lastWorkoutName || '7 Minute Workout';

window.addEventListener('load', () => {
	navigator.serviceWorker?.register("sw.js").then(() => {
		console.log("Service Worker Registered");
	}).catch((error) => {
		console.error("Service Worker Registration Failed", error);
	});
});

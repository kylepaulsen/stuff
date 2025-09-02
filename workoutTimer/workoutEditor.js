import { ui, safeParseInt, appStorage, debounce } from './utils.js';

const updateDuration = () => {
	const text = ui.exercises.innerText.trim();
	const lines = text.split('\n');
	let seconds = 0;
	lines.forEach(l => {
		const eParts = l.split(',');
		if (eParts.length > 1) {
			const last = eParts.pop();
			seconds += Math.max(safeParseInt(last.trim(), 30), 0);
		}
	});
	const min = Math.floor(seconds / 60);
	let sec = (seconds - min * 60) + '';
	if (sec.length === 1) {
		sec = '0' + sec;
	}
	ui.duration.textContent = `${min}:${sec}`;
};

export const parseExercises = (str) => {
	const exercises = [];
	if (!str) {
		str = ui.exercises.innerText;
	}
	str.trim().split('\n').forEach(e => {
		const eParts = e.split(',');
		const last = eParts.pop();
		const seconds = Math.max(safeParseInt(last.trim(), 30), 0);
		const name = eParts.join(',');
		if (name) {
			exercises.push({
				name,
				seconds
			});
		}
	});
	return exercises;
};

const checkForNestedElements = () => ([]).find.call(ui.exercises.children, el => el.children.length > 0);

export const setExercises = (exercises) => {
	console.log('rerendering exercises');
	ui.exercises.innerHTML = '';
	exercises.forEach(e => {
		const div = document.createElement('div');
		div.classList.add('exercise');
		div.textContent = `${e.name}, ${e.seconds}`;
		if (e.name.toLowerCase() === 'rest') {
			div.classList.add('rest');
		}
		ui.exercises.appendChild(div);
	});
	updateDuration();
};

const makeTextRich = () => {
	for (let n of ui.exercises.children) {
		const textContent = n.textContent.toLowerCase();
		if (textContent.includes('rest')) {
			n.className = 'rest';
		} else {
			n.className = 'exercise';
		}
	}
	updateDuration();
};

const addRest = () => {
	const selection = window.getSelection();
	let currentLineEl = selection.baseNode || {};
	const restText = 'Rest, ' + safeParseInt(ui.secondsInput.value, 10);
	if (currentLineEl.nodeName !== '#text' && currentLineEl.textContent !== undefined &&
		currentLineEl.textContent.trim().length === 0) {

		currentLineEl.className = 'rest';
		currentLineEl.textContent = restText;
		return;
	} else if (currentLineEl.nodeName === '#text') {
		currentLineEl = currentLineEl.parentElement;
	}
	const nextLine = currentLineEl.nextElementSibling;
	const newLine = document.createElement('div');
	newLine.className = 'rest';
	newLine.textContent = restText;
	if (nextLine && nextLine.parentElement === ui.exercises) {
		ui.exercises.insertBefore(newLine, nextLine);
	} else {
		ui.exercises.appendChild(newLine);
	}
	makeTextRich();
};

ui.addRestBtn.addEventListener('click', () => {
	addRest();
	appStorage.lastWorkout = ui.exercises.innerText;
});

ui.exercises.addEventListener('keyup', () => {
	for (let n of ui.exercises.childNodes) {
		if (n.nodeName === '#text') {
			const textDiv = document.createElement('div');
			textDiv.textContent = n.textContent;
			ui.exercises.insertBefore(textDiv, n);
			n.remove();
		}
	}
	if (ui.exercises.innerText.trim().length === 0) {
		ui.exercises.innerHTML = '<div><br></div>';
	}
});

ui.exercises.addEventListener('keyup', debounce(() => {
	makeTextRich();
	appStorage.lastWorkout = ui.exercises.innerText;
}, 100));

ui.exercises.addEventListener('blur', () => {
	if (checkForNestedElements()) {
		setExercises(parseExercises());
	}
});

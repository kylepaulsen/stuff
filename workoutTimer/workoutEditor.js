import { ui, safeParseInt, appStorage, debounce } from './utils.js';

const specialExerciseKeywords = ['rest', 'loop', 'end'];

const updateDuration = () => {
	const exercises = parseExercises(ui.exercises?.innerText, { unrollLoops: true });
	let seconds = 0;
	exercises.forEach(e => {
		seconds += parseExerciseTime(e);
	});
	const min = Math.floor(seconds / 60);
	let sec = (seconds - min * 60) + '';
	if (sec.length === 1) {
		sec = '0' + sec;
	}
	ui.duration.textContent = `${min}:${sec}`;
};

export const parseExerciseTime = (exercise) => parseTime(exercise.time || exercise.seconds);

const parseTime = (str) => {
	const parts = ('' + str).split(':');
	let min = 0;
	let sec = 0;
	if (parts.length > 1) {
		min = safeParseInt(parts[0], 0);
		sec = safeParseInt(parts[1], 0);
	} else {
		sec = safeParseInt(parts[0], 0);
	}
	return min * 60 + sec;
};

export const parseExercises = (str, options = {}) => {
	const MAX_EXERCISES = 9999;
	const lines = (str || "").trim().split('\n');

	// Root scope is just a loop that runs once
	const stack = [{ loops: 1, items: [] }];

	const getExerciseCount = (stack) => {
		let count = 0;
		for (let i = 0; i < stack.length; i++) {
			const currentLevel = stack[i];
			count += currentLevel.items.length * currentLevel.loops;
		}
		return count;
	};

	for (let line of lines) {
		const parts = line.split(',');
		let lastPart;
		if (parts.length > 1) {
			lastPart = parts.pop()?.trim();
		}
		const label = parts.join(',').trim();
		const labelLower = label.toLowerCase();
		const value = lastPart;

		if (options.unrollLoops && labelLower === 'loop') {
			stack.push({ loops: value, items: [] });
		} else if (options.unrollLoops && labelLower === 'end') {
			if (stack.length > 1) {
				const expectedCount = getExerciseCount(stack);
				if (expectedCount > MAX_EXERCISES) {
					break;
				}
				const currentScope = stack.pop();
				const parentScope = stack[stack.length - 1];

				for (let x = 0; x < currentScope.loops; x++) {
					parentScope.items = parentScope.items.concat(currentScope.items);
				}
			}
		} else if (label.length > 0) {
			// It's a regular exercise
			const currentScope = stack[stack.length - 1];
			const newExercise = {
				name: label,
				time: value
			};
			if (specialExerciseKeywords.includes(labelLower)) {
				newExercise.type = labelLower;
			}
			currentScope.items.push(newExercise);
		}
	}

	// Handle "hanging" loops (if user forgot 'End')
	while (stack.length > 1) {
		const expectedCount = getExerciseCount(stack);
		const unclosed = stack.pop();
		const parentScope = stack[stack.length - 1];
		if (expectedCount > MAX_EXERCISES) {
			parentScope.items = parentScope.items.concat(unclosed.items);
		} else {
			for (let x = 0; x < unclosed.loops; x++) {
				parentScope.items = parentScope.items.concat(unclosed.items);
			}
		}
	}

	return stack[0].items;
};

const checkForNestedElements = () => ([]).find.call(ui.exercises.children, el => el.children.length > 0);

export const setExercises = (exercises) => {
	ui.exercises.innerHTML = '';
	exercises.forEach(e => {
		const div = document.createElement('div');
		if (e.type === 'end') {
			div.textContent = `${e.name}`;
		} else {
			div.textContent = `${e.name}, ${e.time || e.seconds}`;
		}
		if (specialExerciseKeywords.includes(e.type)) {
			div.classList.add(e.type);
		} else {
			div.classList.add('exercise');
		}
		ui.exercises.appendChild(div);
	});
	updateDuration();
};

const makeTextRich = () => {
	for (let n of ui.exercises.children) {
		const exerciseName = (n.textContent || '').toLowerCase().split(',')[0].trim();
		if (specialExerciseKeywords.includes(exerciseName)) {
			n.className = exerciseName;
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
		setExercises(parseExercises(ui.exercises?.innerText));
	}
});

const APP_STORAGE_NAME = 'kyles-workout-timer';
const appLocalStorage = JSON.parse(localStorage[APP_STORAGE_NAME] || '{}');
let saveAppStorageTimeout;
export const appStorage = new Proxy(appLocalStorage, {
	set: (target, key, value) => {
		target[key] = value;
		clearTimeout(saveAppStorageTimeout);
		saveAppStorageTimeout = setTimeout(() => {
			localStorage[APP_STORAGE_NAME] = JSON.stringify(target);
		}, 0);
		return true;
	}
});

export const getAllUi = (root = document) => {
	const ui = {};
	const allIds = root.querySelectorAll('[data-id]');
	for (let x = 0; x < allIds.length; x++) {
		ui[allIds[x].dataset.id] = allIds[x];
	}
	return ui;
};

export const ui = getAllUi();

export const debounce = (fn, delay) => {
	let timeout;
	return () => {
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(fn, delay);
	};
};

export const safeParseInt = (str = '', defaultNum) => {
	const num = parseInt(str.trim(), 10);
	if (Number.isNaN(num)) {
		return defaultNum;
	}
	return num;
};

export const getPrettyTime = (seconds) => {
	if (seconds < 60) {
		return seconds;
	}
	const min = Math.floor(seconds / 60);
	const sec = seconds - min * 60;
	return `${min}:${sec < 10 ? '0' + sec : sec}`;
};

import { ui } from './utils.js';

let challengeTimeout;

const startTimeout = () => {
	clearTimeout(challengeTimeout);
	challengeTimeout = setTimeout(() => {
		ui.unlockWrapper.classList.remove('visible');
		resetHandle();
	}, 3000);
};

const showUnlockChallenge = () => {
	ui.unlockWrapper.classList.add('visible');
	clearTimeout(challengeTimeout);
};

const resetHandle = () => {
	ui.unlockHandle.style.transform = `translateY(0)`;
};

let isDragging = false;
let startY = 0;
const trackHeight = 200;
const handleSize = 50;
const maxDelta = trackHeight - handleSize - 10; // 10 for padding (5 bottom + 5 top)

const onStart = (e) => {
	clearTimeout(challengeTimeout);
	if (e.target === ui.unlockHandle) {
		isDragging = true;
		startY = e.clientY || e.touches[0].clientY;
		ui.unlockHandle.style.transition = 'none';
		if (e.cancelable) e.preventDefault();
		e.stopPropagation();
	} else if (ui.blackOverlay.style.display === 'block') {
		showUnlockChallenge();
	}
};

const onMove = (e) => {
	if (!isDragging) return;
	if (e.cancelable) e.preventDefault();
	const currentY = e.clientY || (e.touches && e.touches[0].clientY);
	if (currentY === undefined) return;

	let deltaY = startY - currentY;
	deltaY = Math.max(0, Math.min(deltaY, maxDelta));

	ui.unlockHandle.style.transform = `translateY(-${deltaY}px)`;

	if (deltaY >= maxDelta * 0.95) {
		unlock();
	}
};

const onEnd = () => {
	if (isDragging) {
		isDragging = false;
		ui.unlockHandle.style.transition = 'transform 0.3s ease';
		resetHandle();
	}
	if (ui.unlockWrapper.classList.contains('visible')) {
		startTimeout();
	}
};

const unlock = () => {
	isDragging = false;
	if (document.fullscreenElement) {
		document.exitFullscreen();
	}
	ui.blackOverlay.style.display = 'none';
	ui.unlockWrapper.classList.remove('visible');
	ui.workoutDialog.showModal();
	resetHandle();
};

ui.screenOffBtn.addEventListener('click', () => {
	ui.blackOverlay.style.display = 'block';
	ui.workoutDialog.close();
	ui.blackOverlay.requestFullscreen();
});

ui.blackOverlay.addEventListener('mousedown', onStart);
ui.blackOverlay.addEventListener('touchstart', onStart, { passive: false });

window.addEventListener('mousemove', onMove);
window.addEventListener('touchmove', onMove, { passive: false });

window.addEventListener('mouseup', onEnd);
window.addEventListener('touchend', onEnd);

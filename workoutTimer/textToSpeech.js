import { ui, appStorage } from './utils.js';

let voices = [];
const checkForVoices = () => {
	if (voices.length === 0) {
		voices = speechSynthesis.getVoices();
		if (voices.length > 0) {
			voices.forEach((v) => {
				const opt = document.createElement('option');
				const name = `${v.name} (${v.lang})`;
				opt.textContent = name;
				ui.voiceSelect.appendChild(opt);
			});
			const loadPreferredVoice = (preferredVoice = '') => Array.from(ui.voiceSelect.options).some(o => {
				if (preferredVoice.test && o.textContent.toLowerCase().search(preferredVoice) > -1) {
					o.setAttribute('selected', 'selected');
					return true;
				} else if (preferredVoice.toLowerCase && o.textContent.toLowerCase() === preferredVoice.toLowerCase()) {
					o.setAttribute('selected', 'selected');
					return true;
				}
				return false;
			});
			[appStorage.preferredVoice, /Google US Eng/i, /en[-_ ]us/i].some((v) => loadPreferredVoice(v));
			clearInterval(checkForVoicesIntervalId);
		}
	}
};
const checkForVoicesIntervalId = setInterval(checkForVoices, 100);

export const primeSpeechSynthesis = () => {
	say('z', 2, true);
};

export const say = (msg, speed, mute) => {
	window.speechSynthesis.cancel();
	const speakIt = new SpeechSynthesisUtterance(msg);
	speakIt.rate = speed || 1;
	speakIt.voice = voices[ui.voiceSelect.selectedIndex];
	speakIt.pitch = 1;
	if (mute) {
		speakIt.volume = 0;
	}
	window.speechSynthesis.speak(speakIt);
};

window.say = say;

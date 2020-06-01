const { Tone, WebMidi, instruments, keyboardKeys } = window;

const ui = {};
document.querySelectorAll('[data-ui]').forEach(item => {
    ui[item.dataset.ui] = item;
});

// removes all delay from playing notes.
Tone.context.lookAhead = 0;

const compressor = new Tone.Compressor();
compressor.toMaster();

const masterGain = new Tone.Gain(0.5);
masterGain.connect(compressor);

const MAX_SYNTHS = 15;
let synthPool = [];
let activeSynths = {};
let octave = 4;

const setInstrument = instrument => {
    Object.values(activeSynths).forEach(synth => {
        if (synth) {
            synth.triggerRelease();
            synthPool.push(synth);
        }
    });
    activeSynths = {};
    const nextInstrument = instruments[instrument];
    if (nextInstrument) {
        synthPool.forEach(synth => synth.dispose());
        synthPool = [];

        for (let x = 0; x < MAX_SYNTHS; x++) {
            const synth = new Tone.Synth(nextInstrument).connect(masterGain);
            synthPool.push(synth);
        }
    }
};

ui.instrumentSelect.innerHTML = Object.keys(instruments)
    .map(instrument => `<option value="${instrument}">${instrument}</option>`).join('');

ui.instrumentSelect.addEventListener('change', () => {
    setInstrument(ui.instrumentSelect.value);
});

ui.instrumentSelect.value = 'pulse25';
setInstrument(ui.instrumentSelect.value);

ui.volumeInput.addEventListener('input', () => {
    masterGain.gain.value = ui.volumeInput.value;
});
ui.volumeInput.value = masterGain.gain.value;

const setOctave = newOctave => {
    octave = newOctave;
    ui.octaveSpan.textContent = octave;
};
setOctave(4);

ui.downOctaveBtn.addEventListener('click', () => {
    setOctave(Math.max(octave - 1, 0));
});

ui.upOctaveBtn.addEventListener('click', () => {
    setOctave(Math.min(octave + 1, 9));
});

const updatePlayingNotes = () => {
    const playingNotes = Object.keys(activeSynths).filter(note => activeSynths[note]);
    playingNotes.sort((a, b) => Tone.Frequency(a) - Tone.Frequency(b));
    ui.currentNotes.textContent = playingNotes.join(' , ');
};

const startNote = note => {
    if (!activeSynths[note]) {
        const synth = synthPool.shift();
        if (synth) {
            activeSynths[note] = synth;
            synth.triggerAttack(note, 0, 0.5);
            updatePlayingNotes();
        }
    }
};

const stopNote = note => {
    const synth = activeSynths[note];
    if (synth) {
        synth.triggerRelease();
        activeSynths[note] = undefined;
        synthPool.push(synth);
        updatePlayingNotes();
    }
};

WebMidi.enable(err => {
    if (err) {
        // eslint-disable-next-line no-alert
        alert('Failed to set up midi interface.');
        console.error(err);
        return;
    }

    WebMidi.inputs.forEach(input => {
        input.addListener('noteon', 'all', e => {
            startNote(e.note.name + e.note.octave);
        });

        input.addListener('noteoff', 'all', e => {
            stopNote(e.note.name + e.note.octave);
        });
    });
});

window.addEventListener('keydown', e => {
    const noteDef = keyboardKeys[e.key];
    if (noteDef) {
        const note = noteDef[0] + (noteDef[1] + octave);
        startNote(note);
    }
});

window.addEventListener('keyup', e => {
    const noteDef = keyboardKeys[e.key];
    if (noteDef) {
        const note = noteDef[0] + (noteDef[1] + octave);
        stopNote(note);
    }
});

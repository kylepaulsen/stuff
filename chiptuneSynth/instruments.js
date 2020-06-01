
window.instruments = {
    triangle: {
        oscillator: {
            type: 'triangle'
        },
        envelope: {
            attack: 0,
            decay: 0,
            sustain: 1,
            release: 0
        }
    },
    square: {
        oscillator: {
            type: 'square'
        },
        envelope: {
            attack: 0,
            decay: 0,
            sustain: 1,
            release: 0
        }
    },
    pulse25: {
        oscillator: {
            type: 'pulse',
            width: 0.50 // formula for pulse width: 1 - w / 0.5 (w = 0.25)
        },
        envelope: {
            attack: 0,
            decay: 0,
            sustain: 1,
            release: 0
        }
    },
    pulse12: {
        oscillator: {
            type: 'pulse',
            width: 0.75 // formula for pulse width: 1 - w / 0.5 (w = 0.125)
        },
        envelope: {
            attack: 0,
            decay: 0,
            sustain: 1,
            release: 0
        }
    }
};

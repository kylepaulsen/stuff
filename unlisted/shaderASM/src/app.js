const $ = document.querySelector.bind(document);

const canvas = document.querySelector('#canvas');
canvas.width = 255;
canvas.height = 255;
const ctx = canvas.getContext('2d');
ctx.fillRect(0, 0, canvas.width, canvas.height);

const cpu = pixelVisionCPU(canvas);
const instructions = cpu.cpuData.instructions;

// some cool stuff:
// r = 255 - x
// g = x
// b = y

// try this shit:
// r = r + t
// x = x - t
// y = y + r


const program = $('#program');
const takeCommands = $('#fakeCommands').cloneNode(true);
takeCommands.id = 'takeCommands';
$('#commands').appendChild(takeCommands);

Sortable.create($('#program'), {
    sort: true,
    group: {
        name: 'list',
        pull: true,
        put: true
    },
    animation: 150,
    onAdd: function(evt) {
        addCmd(evt.item);
    },
    onEnd: function(evt) {
        evt.item.style.opacity = 1;
        evt.item.style.width = 'auto';
        evt.item.style.height = 'auto';
        evt.item.style.marginBottom = '6px';
    },
    onMove: function (evt, originalEvent) {
        var targetEl = evt.dragged;
        if (targetEl.parentElement !== document.body) {
            targetEl.style.opacity = 0;
            targetEl.style.width = 'auto';
            targetEl.style.height = 'auto';
            targetEl.style.marginBottom = '6px';
        } else {
            targetEl.style.width = '0px';
            targetEl.style.height = '0px';
            targetEl.style.marginBottom = '0px';
        }
    }
});

Sortable.create($('#takeCommands'), {
    sort: false,
    group: {
        name: 'list',
        pull: 'clone',
        put: false
    },
    animation: 150,
    onEnd: function(evt) {
        evt.item.style.opacity = 1;
        evt.item.style.width = 'auto';
        evt.item.style.height = 'auto';
        evt.item.style.marginBottom = '6px';
    },
    onMove: function (evt, originalEvent) {
        var targetEl = evt.dragged;
        if (targetEl.parentElement !== document.body) {
            targetEl.style.opacity = 0;
            targetEl.style.width = 'auto';
            targetEl.style.height = 'auto';
            targetEl.style.marginBottom = '6px';
        } else {
            targetEl.style.width = '0px';
            targetEl.style.height = '0px';
            targetEl.style.marginBottom = '0px';
        }
    }
});

Sortable.create($('body'), {
    sort: false,
    handle: '.noDragsForYou',
    group: {
        name: 'list',
        pull: false,
        put: true
    },
    onAdd: function (evt) {
        var el = evt.item;
        el.parentNode.removeChild(el);
    }
});

function selectMemory(currentVal) {
    return new Promise(function(res) {
        const memCont = $('#memory');
        memCont.className = 'selectingMemory';
        let currentSelected = $('#mem1');
        if (currentVal) {
            const idx = locToIdx[currentVal] || currentVal;
            currentSelected = memCont.querySelectorAll('.memory')[idx];
        }
        currentSelected.className += ' selectedMem';

        const mouseMove = function(e) {
            const target = e.target;
            if (target !== currentSelected && target.className === 'memory') {
                currentSelected.className = 'memory';
                currentSelected = target;
                currentSelected.className += ' selectedMem';
            }
        };

        const mouseDown = function(e) {
            memCont.className = '';
            currentSelected.className = 'memory';
            memCont.removeEventListener('mousemove', mouseMove);
            window.removeEventListener('mousedown', mouseDown);
            res(currentSelected.querySelector('.memLabel').textContent);
        };

        memCont.addEventListener('mousemove', mouseMove);
        window.addEventListener('mousedown', mouseDown);
    });
}

function getCreateValueNumber() {
    return parseInt($('#numHundreds').textContent + $('#numTens').textContent + $('#numOnes').textContent);
}

function createValue(currentVal) {
    let vals = ['0', '0', '0'];
    if (currentVal !== undefined) {
        while (currentVal.length !== 3) {
            currentVal = '0' + currentVal;
        }
        vals = currentVal.split('');
    }
    $('#numHundreds').textContent = vals[0];
    $('#numTens').textContent = vals[1];
    $('#numOnes').textContent = vals[2];

    return new Promise(function(res) {
        const modal = $('#createValueModal');
        const overlay = $('#modalOverlay');
        const createBtn = $('#createBtn');
        const modalOverlay = $('#modalOverlay');
        modal.style.display = 'block';
        overlay.style.display = 'block';

        const create = function() {
            createBtn.removeEventListener('click', create);
            modalOverlay.removeEventListener('click', create);
            modal.style.display = 'none';
            overlay.style.display = 'none';
            res(getCreateValueNumber());
        };

        createBtn.addEventListener('click', create);
        modalOverlay.addEventListener('click', create);
    });
}

function addCmd(el) {
    console.log('add!');
    const cmdType = el.className.split(' ')[0];
    let inputPromise;
    switch (cmdType) {
    case 'readCmd':
    case 'storeCmd':
    case 'addCmd':
    case 'subtractCmd':
        inputPromise = selectMemory();
        break;
    case 'createCmd':
        inputPromise = createValue();
        break;
    }

    if (inputPromise) {
        inputPromise.then(function(val) {
            const valContainer = document.createElement('span');
            valContainer.className = 'commandVal';
            valContainer.textContent = val;
            el.appendChild(valContainer);

            valContainer.addEventListener('click', function() {
                if (el.className.indexOf('createCmd') > -1) {
                    createValue(valContainer.textContent).then(function(val) {
                        valContainer.textContent = val;
                        el.dataset.val = val;
                    });
                } else {
                    valContainer.className += ' selectingVal';
                    selectMemory(valContainer.textContent).then(function(val) {
                        valContainer.className = 'commandVal';
                        valContainer.textContent = val;
                        el.dataset.val = val;
                    });
                }
            });

            el.dataset.val = val;
        });
    }
}

function compileProgram() {
    console.log('compile!');
    const commands = document.querySelectorAll('#program .command');
    cpu.cpuData.instructions = [];

    for (let x = 0; x < commands.length; x++) {
        const cmd = commands[x];
        const cmdType = cmd.className.split(' ')[0];
        let newCommand;
        switch (cmdType) {
        case 'readCmd':
            newCommand = new ReadInst(loc(cmd.dataset.val));
            break;
        case 'storeCmd':
            newCommand = new StoreInst(loc(cmd.dataset.val));
            break;
        case 'createCmd':
            newCommand = new CreateInst(parseInt(cmd.dataset.val));
            break;
        case 'addCmd':
            newCommand = new AddInst(loc(cmd.dataset.val));
            break;
        case 'subtractCmd':
            newCommand = new SubtractInst(loc(cmd.dataset.val));
            break;
        case 'pixelOutCmd':
            newCommand = new PixelOutInst();
            break;
        }

        if (newCommand) {
            cpu.cpuData.instructions.push(newCommand);
        }
    }
}

$('#playBtn').addEventListener('click', function() {
    cpu.stop();
    compileProgram();
    cpu.run();
});

$('#stopBtn').addEventListener('click', function() {
    cpu.stop();
});


function resetIfOver255() {
    if (getCreateValueNumber() > 255) {
        $('#numTens').textContent = '5';
        $('#numOnes').textContent = '5';
    }
}

$('#hunUp').addEventListener('click', function() {
    const numHundreds = $('#numHundreds');
    numHundreds.textContent = (parseInt(numHundreds.textContent) + 1) % 3;
    resetIfOver255();
});

$('#hunDown').addEventListener('click', function() {
    const numHundreds = $('#numHundreds');
    let nextVal = parseInt(numHundreds.textContent) - 1;
    nextVal = nextVal < 0 ? 2 : nextVal;
    numHundreds.textContent = nextVal;
    resetIfOver255();
});

$('#tenUp').addEventListener('click', function() {
    const numTens = $('#numTens');
    numTens.textContent = (parseInt(numTens.textContent) + 1) % 10;
    resetIfOver255();
});

$('#tenDown').addEventListener('click', function() {
    const numTens = $('#numTens');
    let nextVal = parseInt(numTens.textContent) - 1;
    nextVal = nextVal < 0 ? 9 : nextVal;
    numTens.textContent = nextVal;
    resetIfOver255();
});

$('#oneUp').addEventListener('click', function() {
    const numOnes = $('#numOnes');
    numOnes.textContent = (parseInt(numOnes.textContent) + 1) % 10;
    resetIfOver255();
});

$('#oneDown').addEventListener('click', function() {
    const numOnes = $('#numOnes');
    let nextVal = parseInt(numOnes.textContent) - 1;
    nextVal = nextVal < 0 ? 9 : nextVal;
    numOnes.textContent = nextVal;
    resetIfOver255();
});

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const canvas = document.querySelector('#canvas');
canvas.width = 256;
canvas.height = 256;
const ctx = canvas.getContext('2d');
ctx.fillRect(0, 0, canvas.width, canvas.height);

const cpu = pixelVisionCPU(canvas);
const instructions = cpu.cpuData.instructions;

const program = $('#program');
const takeCommands = $('#fakeCommands').cloneNode(true);
takeCommands.id = 'takeCommands';
$('#commands').appendChild(takeCommands);

const jumpSvg = $('#jumpSvg');
let nextJumpId = 0;
let currentlyDraggingEl;
let currentScale = 1;

Sortable.create(program, {
    sort: true,
    group: {
        name: 'list',
        pull: true,
        put: true
    },
    filter: '#jumpSvg',
    animation: 150,
    onAdd: function(evt) {
        setTimeout(function() {
            // must wait for render?
            fixJumpPaths();
            addCmd(evt.item);
        }, 0);
    },
    onStart: function(evt) {
        currentlyDraggingEl = evt.item;
    },
    onEnd: function(evt) {
        const targetEl = evt.item;
        targetEl.style.opacity = 1;
        if (targetEl.className.indexOf('jumpEnd') === -1) {
            targetEl.style.width = 'auto';
            targetEl.style.height = 'auto';
            targetEl.style.marginBottom = '6px';
        }
        fixJumpPaths();
        currentlyDraggingEl = undefined;
    },
    onMove: function (evt, originalEvent) {
        const targetEl = evt.dragged;
        if (targetEl.parentElement !== document.body) {
            targetEl.style.opacity = 0;
            if (targetEl.className.indexOf('jumpEnd') === -1) {
                targetEl.style.width = 'auto';
                targetEl.style.height = 'auto';
                targetEl.style.marginBottom = '6px';
            }
        } else {
            if (targetEl.className.indexOf('jumpEnd') === -1) {
                targetEl.style.width = '0px';
                targetEl.style.height = '0px';
                targetEl.style.marginBottom = '0px';
            }
        }
    }
});

Sortable.create(takeCommands, {
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
        const el = evt.item;
        if (el.className.indexOf('jump') > -1) {
            const id = el.dataset.jumpId;
            const start = $('#jumpCmd' + id);
            const end = $('#jumpEnd' + id);
            const endPath = $('#jumpPath' + id);
            start.parentNode.removeChild(start);
            end.parentNode.removeChild(end);
            endPath.parentNode.removeChild(endPath);
        } else {
            el.parentNode.removeChild(el);
        }
    }
});

document.body.addEventListener('dragover', fixJumpPaths);
program.addEventListener('dragover', fixJumpPaths);
takeCommands.addEventListener('dragover', fixJumpPaths);


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

function fixJumpPaths(e) {
    jumpSvg.setAttributeNS(null, 'height', program.offsetHeight);
    const jumpCmds = program.querySelectorAll('.jumpCmd');
    let x = jumpCmds.length;

    const fixIt = function(cmdEl) {
        const jumpId = cmdEl.dataset.jumpId;
        const jumpTarget = $('#jumpEnd' + jumpId);
        const jumpPath = $('#jumpPath' + jumpId);
        let startX = 78;
        if (cmdEl.className.indexOf('jumpLessThan') > -1) {
            startX = 184;
        } else if (cmdEl.className.indexOf('jumpEqual') > -1) {
            startX = 190;
        }

        if (jumpTarget) {
            let startY = cmdEl.offsetTop + 24;
            let endY = jumpTarget.offsetTop + 24;
            if (currentlyDraggingEl && e) {
                const offset = program.getBoundingClientRect().top;
                if (cmdEl === currentlyDraggingEl) {
                    startY = e.clientY / currentScale - offset / currentScale;
                } else if (jumpTarget === currentlyDraggingEl) {
                    endY = e.clientY / currentScale - offset / currentScale;
                }
            }
            // sigmoid function
            const curveSize = Math.max((2 / (1 + Math.pow(Math.E, -Math.abs(startY - endY) / 200)) - 1) * 450, startX + 34);
            let path = 'M' + startX + ' ' + startY + ' C' + curveSize + ' ' + startY + ' ' +
                curveSize + ' ' + endY + ' 96 ' + endY;
            jumpPath.setAttributeNS(null, 'd', path);
        }
    };

    while (x-- > 0) {
        fixIt(jumpCmds[x]);
    }

    if (currentlyDraggingEl && currentlyDraggingEl.className.indexOf('jumpCmd') > -1) {
        fixIt(currentlyDraggingEl);
    }
}

function addJumpRelatedElements(el) {
    const jumpEnd = document.createElement('div');
    jumpEnd.className = 'jumpEnd command';
    jumpEnd.id = 'jumpEnd' + nextJumpId;
    jumpEnd.dataset.jumpId = nextJumpId;
    el.id = 'jumpCmd' + nextJumpId;
    el.dataset.jumpId = nextJumpId;
    el.parentNode.insertBefore(jumpEnd, el);
    createJumpPath(nextJumpId);
    nextJumpId++;
}

function createJumpPath(id) {
    const jumpPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    jumpPath.id = 'jumpPath' + id;
    jumpPath.setAttributeNS(null, 'class', 'jumpPath');
    jumpSvg.appendChild(jumpPath);
}

function addCommandVal(el, val) {
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
}

function addCmd(el) {
    console.log('add!');
    const cmdType = el.className.split(' ')[0];
    let inputPromise;
    let isJump = false;

    if (cmdType === 'createCmd') {
        inputPromise = createValue();
    } else if (cmdType === 'jumpCmd') {
        isJump = true;
        if (el.className.indexOf('jumpLessThan') > -1 || el.className.indexOf('jumpEqual') > -1) {
            inputPromise = selectMemory();
        } else {
            addJumpRelatedElements(el);
            fixJumpPaths();
        }
    } else if (cmdType !== 'pixelOutCmd') {
        inputPromise = selectMemory();
    }

    if (inputPromise) {
        inputPromise.then(function(val) {
            addCommandVal(el, val);

            el.dataset.val = val;

            if (isJump) {
                addJumpRelatedElements(el);
                fixJumpPaths();
            }
        });
    }
}

function saveToJSON() {
    const allCmdEls = program.querySelectorAll('.command');
    const cmds = [];
    for (let x = 0; x < allCmdEls.length; x++) {
        const cmd = allCmdEls[x];
        const toSave = {};
        toSave.className = cmd.className;
        if (cmd.id) {
            toSave.id = cmd.id;
        }
        if (cmd.dataset.val) {
            toSave.val = cmd.dataset.val;
        }
        if (cmd.dataset.jumpId) {
            toSave.jumpId = cmd.dataset.jumpId;
        }
        cmds.push(toSave);
    }
    return JSON.stringify(cmds);
}

function loadFromJSON(stringData) {
    const paths = $$('.jumpPath');
    let t = paths.length;
    while (t-- > 0) {
        paths[t].parentNode.removeChild(paths[t]);
    }

    program.innerHTML = '';
    const commands = $('#fakeCommands');
    const data = JSON.parse(stringData);
    for (let x = 0; x < data.length; x++) {
        //<div class="readCmd command"><span>Read</span></div>
        const cmd = data[x];
        const refNode = commands.querySelector('.' + cmd.className.replace(/ /g, '.'));
        let newCommand;
        if (!refNode) {
            newCommand = document.createElement('div');
            newCommand.className = cmd.className;
        } else {
            newCommand = refNode.cloneNode(true);
        }
        if (cmd.val !== undefined) {
            newCommand.dataset.val = cmd.val;
            addCommandVal(newCommand, cmd.val);
        }
        if (cmd.jumpId !== undefined) {
            if (cmd.className.indexOf('jumpEnd') > -1) {
                newCommand.id = 'jumpEnd' + cmd.jumpId;
            } else {
                newCommand.id = 'jumpCmd' + cmd.jumpId;
                createJumpPath(cmd.jumpId);
            }
            newCommand.dataset.jumpId = cmd.jumpId;
            nextJumpId = Math.max(nextJumpId, cmd.jumpId + 1);
        }
        program.appendChild(newCommand);
    }
    fixJumpPaths();
    compileProgram();
}

function saveGif(numFrames, delay, quality) {
    console.log('saveGif(numFrames, delay_in_ms, quality) // lower quality is better.');
    numFrames = numFrames === undefined ? 30 : numFrames;
    delay = delay === undefined ? 30 : delay;
    quality = quality === undefined ? 1 : quality;
    const cores = navigator.hardwareConcurrency || 1;

    const gif = new GIF({
        workers: Math.min(cores, 16),
        quality: 1,
        width: 256,
        height: 256,
        workerScript: 'vendor/gif.worker.js'
    });

    compileProgram();
    cpu.stop();
    cpu.reset();
    while (numFrames-- > 0) {
        cpu.nextFrame();
        gif.addFrame(ctx, {copy: true, delay: delay});
    }

    gif.on('finished', function(blob) {
        window.open(URL.createObjectURL(blob));
    });

    gif.render();
}

function findJumpEndIdx(commands, id) {
    const target = $('#jumpEnd' + id);
    let realIdx = 0;
    for (let x = 0; x < commands.length; x++) {
        const cmd = commands[x];
        if (cmd === target) {
            return realIdx;
        }
        if (cmd.className.indexOf('jumpEnd') === -1) {
            realIdx++;
        }
    }
}

function compileProgram() {
    console.log('compile!');
    const commands = program.querySelectorAll('.command');
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
        case 'multiplyCmd':
            newCommand = new MultiplyInst(loc(cmd.dataset.val));
            break;
        case 'divideCmd':
            newCommand = new DivideInst(loc(cmd.dataset.val));
            break;
        case 'distanceCmd':
            newCommand = new DistanceInst(loc(cmd.dataset.val));
            break;
        case 'modCmd':
            newCommand = new ModInst(loc(cmd.dataset.val));
            break;
        case 'jumpCmd':
            if (cmd.className.indexOf('jumpLessThan') > -1) {
                newCommand = new JumpLessThanInst(loc(cmd.dataset.val), findJumpEndIdx(commands, cmd.dataset.jumpId));
            } else if (cmd.className.indexOf('jumpEqual') > -1) {
                newCommand = new JumpEqualInst(loc(cmd.dataset.val), findJumpEndIdx(commands, cmd.dataset.jumpId));
            } else {
                newCommand = new JumpInst(findJumpEndIdx(commands, cmd.dataset.jumpId));
            }
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

function getScale() {
    currentScale = parseFloat(window.getComputedStyle($('#remoteScale')).transform.substring(7));
    if (isNaN(currentScale)) {
        currentScale = 1;
    }
}
getScale();
window.addEventListener('resize', getScale);

(function(global) {
    'use strict';

    global.app = global.app || {};
    const app = global.app;
    const ui = app.ui;
    const util = app.util;

    const canvas = ui.canvas;

    const ctx = canvas.getContext('2d');

    const colorComparer = app.colorComparer();
    const shades = [];
    let colors = app.beads.slice().filter(function(c) {
        if (c.name.toLowerCase().match(/grey|black|white/)) {
            shades.push(c);
            return false;
        }
        return true;
    });
    shades.sort(function(a, b) {
        return (a.name.toLowerCase() > b.name.toLowerCase()) * 2 - 1;
    });
    colors.sort(function(a, b) {
        return colorComparer.compareColors(255, 0, 0, a.r, a.g, a.b) -
            colorComparer.compareColors(255, 0, 0, b.r, b.g, b.b);
    });
    colors = shades.concat(colors);
    let currentColor = colors[0];
    ui.currentColor.style.background = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`;
    colors.push({
        name: 'Transparent',
        r: 0,
        g: 0,
        b: 0,
        transparent: 1
    });

    colors.forEach(function(bead, idx) {
        const color = document.createElement('div');
        color.className = 'selectableColor';
        if (!bead.transparent) {
            color.style.background = `rgb(${bead.r}, ${bead.g}, ${bead.b})`;
        } else {
            color.style.background = 'url(bg.png)';
        }
        color.setAttribute('title', bead.name);
        color.dataset.beadIndex = idx;
        ui.colorSelect.appendChild(color);
    });

    util.listen(ui.paintBtn, 'click', function() {
        util.showMenu('paintMenu');
        app.tool = 'paint';
    });

    util.listen(ui.colorSelect, 'click', function(e) {
        if (e.target.className === 'selectableColor') {
            currentColor = colors[e.target.dataset.beadIndex];
            if (!currentColor.transparent) {
                ui.currentColor.style.background = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`;
            } else {
                ui.currentColor.style.background = 'url(bg.png)';
            }
        }
    });

    const cancelPaintMode = function() {
        util.showMenu('mainMenu');
        app.tool = 'none';
    };

    util.listen(ui.paintDoneBtn, 'click', cancelPaintMode);

    const paintPoint = function(e) {
        const point = util.getCanvasPixelFromMouseEvent(e);
        ctx.fillStyle = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`;
        if (currentColor.transparent) {
            ctx.clearRect(point.x, point.y, 1, 1);
        } else {
            ctx.fillRect(point.x, point.y, 1, 1);
        }
    };

    const fillPoint = function(e) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const dataArr = imageData.data;
        const maxIndex = dataArr.length;
        const point = util.getCanvasPixelFromMouseEvent(e);
        let currentIndex = 4 * (point.y * canvas.width + point.x);
        const colorToMatch = {
            r: dataArr[currentIndex],
            g: dataArr[currentIndex + 1],
            b: dataArr[currentIndex + 2]
        };
        if (colorToMatch.r === currentColor.r && colorToMatch.g === currentColor.g &&
            colorToMatch.b === currentColor.b) { // bail if we are trying to fill the same color as current color.
            return;
        }
        const indexSet = {};
        indexSet[currentIndex] = 1;
        const indicesToVisit = [currentIndex];
        while (indicesToVisit.length) {
            const nextIndex = indicesToVisit.shift();
            dataArr[nextIndex] = currentColor.r;
            dataArr[nextIndex + 1] = currentColor.g;
            dataArr[nextIndex + 2] = currentColor.b;
            dataArr[nextIndex + 3] = currentColor.transparent ? 0 : 255;

            const upIndex = nextIndex - 4 * canvas.width;
            if (upIndex >= 0 &&
                !indexSet[upIndex] &&
                dataArr[upIndex] === colorToMatch.r &&
                dataArr[upIndex + 1] === colorToMatch.g &&
                dataArr[upIndex + 2] === colorToMatch.b) {

                indexSet[upIndex] = 1;
                indicesToVisit.push(upIndex);
            }

            const rightIndex = nextIndex + 4;
            if (rightIndex < maxIndex &&
                !indexSet[rightIndex] &&
                rightIndex % (canvas.width * 4) !== 0 && // prevent torus effect.
                dataArr[rightIndex] === colorToMatch.r &&
                dataArr[rightIndex + 1] === colorToMatch.g &&
                dataArr[rightIndex + 2] === colorToMatch.b) {

                indexSet[rightIndex] = 1;
                indicesToVisit.push(rightIndex);
            }

            const downIndex = nextIndex + 4 * canvas.width;
            if (downIndex < maxIndex &&
                !indexSet[downIndex] &&
                dataArr[downIndex] === colorToMatch.r &&
                dataArr[downIndex + 1] === colorToMatch.g &&
                dataArr[downIndex + 2] === colorToMatch.b) {

                indexSet[downIndex] = 1;
                indicesToVisit.push(downIndex);
            }

            const leftIndex = nextIndex - 4;
            if (leftIndex >= 0 &&
                !indexSet[leftIndex] &&
                nextIndex % (canvas.width * 4) !== 0 && // prevent torus effect.
                dataArr[leftIndex] === colorToMatch.r &&
                dataArr[leftIndex + 1] === colorToMatch.g &&
                dataArr[leftIndex + 2] === colorToMatch.b) {

                indexSet[leftIndex] = 1;
                indicesToVisit.push(leftIndex);
            }
        }
        ctx.putImageData(imageData, 0, 0);
    };

    const copyColor = function(e) {
        const point = util.getCanvasPixelFromMouseEvent(e);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const dataArr = imageData.data;
        const x = (point.y * canvas.width + point.x) * 4;
        if (dataArr[x] !== undefined) {
            const r = dataArr[x];
            const g = dataArr[x + 1];
            const b = dataArr[x + 2];
            const a = dataArr[x + 3];
            if (a === 0) {
                currentColor = colors[colors.length - 1];
                ui.currentColor.style.background = 'url(bg.png)';
            } else {
                ui.currentColor.style.background = `rgb(${r}, ${g}, ${b})`;
                currentColor.r = r;
                currentColor.g = g;
                currentColor.b = b;
            }
        }
    };

    let mouseDown = false;
    document.addEventListener('mousedown', function(e) {
        const target = e.target;
        if (target.nodeName === 'CANVAS' && app.tool === 'paint') {
            if (!e.button) {
                mouseDown = true;
                if (ui.pixelPaintMode.checked) {
                    paintPoint(e);
                } else {
                    fillPoint(e);
                }
            } else if (e.button === 2) {
                copyColor(e);
            }
        }
    });
    document.addEventListener('mousemove', function(e) {
        if (!mouseDown) {
            return;
        }
        const target = e.target;
        if (target.nodeName === 'CANVAS' && app.tool === 'paint' && ui.pixelPaintMode.checked) {
            paintPoint(e);
        }
    });
    document.addEventListener('mouseup', function(e) {
        mouseDown = false;
    });
    document.addEventListener('contextmenu', function(e) {
        if (e.target.nodeName === 'CANVAS' && app.tool === 'paint') {
            e.preventDefault();
        }
    });
})(this);

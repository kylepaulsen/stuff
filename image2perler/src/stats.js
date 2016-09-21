(function(global) {
    'use strict';

    global.app = global.app || {};
    const app = global.app;
    const ui = app.ui;
    const util = app.util;

    const canvas = ui.canvas;
    const ctx = canvas.getContext('2d');

    const colorDict = {};
    app.beads.forEach(function(bead) {
        colorDict[`${bead.r},${bead.g},${bead.b}`] = bead.name;
    });

    const toHex = function(r, g, b) {
        const colors = [];
        colors[0] = r.toString(16);
        colors[1] = g.toString(16);
        colors[2] = b.toString(16);
        for (let x = 0; x < 3; x++) {
            if (colors[x].length === 1) {
                colors[x] = '0' + colors[x];
            }
        }
        return colors.join('');
    };

    util.listen(window, 'mousemove', function(e) {
        if (e.target.nodeName === 'CANVAS') {
            const point = app.util.getCanvasPixelFromMouseEvent(e);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const dataArr = imageData.data;
            const x = (point.y * canvas.width + point.x) * 4;

            let color = '???';
            if (dataArr[x] !== undefined) {
                const r = dataArr[x];
                const g = dataArr[x + 1];
                const b = dataArr[x + 2];
                color = colorDict[r + ',' + g + ',' + b] || '#' + toHex(r, g, b);
                if (dataArr[x + 3] === 0) {
                    color = 'Transparent';
                }
            }

            ui.statsSpan.innerHTML = `(${point.x} , ${point.y}) = ${color}`;
        }
    });

})(this);

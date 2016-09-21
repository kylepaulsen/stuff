(function(global) {
    'use strict';

    global.app = global.app || {};
    const app = global.app;
    const ui = app.ui;
    const util = app.util;

    const canvas = ui.canvas;
    const ctx = canvas.getContext('2d');

    let selectColorMode = false;

    util.onCanvasClick(function(point) {
        if (selectColorMode) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const dataArr = imageData.data;

            const idx = (point.y * canvas.width + point.x) * 4;
            const r = dataArr[idx];
            const g = dataArr[idx + 1];
            const b = dataArr[idx + 2];

            for (let x = 0, len = dataArr.length; x < len; x += 4) {
                if (dataArr[x] === r && dataArr[x + 1] === g && dataArr[x + 2] === b) {
                    dataArr[x + 3] = 0;
                }
            }

            ctx.putImageData(imageData, 0, 0);
        }
    });

    util.listen(ui.transparentBtn, 'click', function() {
        util.showMenu('transparentMenu');
        selectColorMode = true;
    });

    util.listen(ui.transparentDoneBtn, 'click', function() {
        util.showMenu('mainMenu');
        selectColorMode = false;
    });

})(this);

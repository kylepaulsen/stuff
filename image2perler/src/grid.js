(function(global) {
    'use strict';

    global.app = global.app || {};
    const app = global.app;
    const ui = app.ui;
    const util = app.util;

    const canvas = ui.canvas;
    const gridCanvas = ui.gridCanvas;
    const gridCtx = gridCanvas.getContext('2d');

    let gridShowing = false;

    app.drawGrid = function() {
        if (gridShowing) {
            const w = canvas.width;
            const h = canvas.height;
            gridCanvas.width = canvas.offsetWidth;
            gridCanvas.height = canvas.offsetHeight;

            const ratio = 1 / app.pixelRatio;

            if (ratio > 1.9) {
                for (let x = 0; x < w; x++) {
                    util.drawRect(gridCtx, x * ratio, 0, 1, h * ratio);
                }
                for (let y = 0; y < h; y++) {
                    util.drawRect(gridCtx, 0, y * ratio, w * ratio, 1);
                }
            }
        }
    };

    util.listen(ui.showGrid, 'change', function() {
        if (ui.showGrid.checked) {
            gridShowing = true;
            gridCanvas.style.display = 'block';
            app.drawGrid();
        } else {
            gridShowing = false;
            gridCanvas.style.display = 'none';
        }
    });

})(this);

(function(global) {
    'use strict';

    global.app = global.app || {};
    const app = global.app;
    const ui = app.ui;
    const util = app.util;

    const canvas = ui.canvas;
    const cropCanvas = ui.cropCanvas;
    const zoom = ui.zoom;
    const zoomRange = ui.zoomRange;

    app.setZoom = function(zoomP) {
        zoomP = Math.floor(zoomP);
        app.currentZoom = zoomP;
        if (parseInt(zoom.value) !== zoomP) {
            zoom.value = zoomP;
        }
        zoomRange.value = zoomP;

        zoomP = zoomP * app.currentZoomRatio;
        canvas.style.width = `${zoomP}%`;
        cropCanvas.style.width = `${zoomP}%`;
        app.pixelRatio = canvas.width / canvas.offsetWidth;
        app.drawGrid();
    };

    util.listen(zoom, 'keyup change mousewheel', util.doASAP.bind(null, function() {
        const zoomVal = parseInt(zoom.value);
        if (!isNaN(zoomVal)) {
            app.setZoom(zoomVal);
        }
    }));

    util.listen(zoomRange, 'input', function() {
        app.setZoom(zoomRange.value);
    });

    util.listen(window, 'resize', function() {
        app.setZoom(app.currentZoom);
    });

    zoomRange.value = 100;

})(this);

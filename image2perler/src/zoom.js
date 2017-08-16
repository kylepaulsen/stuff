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
        zoomP = Math.max(Math.floor(zoomP), 1);
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
    util.listen(window, 'wheel', function(e) {
        if (e.shiftKey) {
            e.preventDefault();
            const oldZoom = app.currentZoom;
            const zoomAmount = Math.max(Math.floor(oldZoom / 10), 1);
            const scrollAmt = e.deltaY === 0 ? e.deltaX : e.deltaY;
            if (scrollAmt > 0) {
                // zoom out.
                app.setZoom(oldZoom - zoomAmount);
            } else {
                // zoom in.
                app.setZoom(oldZoom + zoomAmount);
            }
            const zoomRatio = app.currentZoom / oldZoom;
            const view = ui.mid;
            view.scrollLeft = (view.scrollLeft + e.pageX) * zoomRatio - e.pageX;
            view.scrollTop = (view.scrollTop + e.pageY) * zoomRatio - e.pageY;
        }
    });

    zoomRange.value = 100;

})(this);

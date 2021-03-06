(function(global) {
    'use strict';

    global.app = global.app || {};
    const app = global.app;
    const ui = app.ui;
    const util = app.util;

    const canvas = ui.canvas;
    const cropCanvas = ui.cropCanvas;
    const cropX = ui.cropX;
    const cropY = ui.cropY;
    const cropWidth = ui.cropWidth;
    const cropHeight = ui.cropHeight;

    const ctx = canvas.getContext('2d');
    const cropCtx = cropCanvas.getContext('2d');

    let cropSquareColor = '#000000';
    let currentColor = 0;

    const updateCropRectangle = function() {
        const x = parseInt(cropX.value);
        const y = parseInt(cropY.value);
        const w = parseInt(cropWidth.value) - 1;
        const h = parseInt(cropHeight.value) - 1;
        if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(h)) {
            app.util.clearCanvas(cropCtx);
            cropCtx.fillStyle = cropSquareColor;
            app.util.drawRect(cropCtx, x, y, w, h);
        }
    };

    util.listen(ui.cropBtn, 'click', function() {
        cropCanvas.style.display = 'block';
        cropCanvas.width = canvas.width;
        cropCanvas.height = canvas.height;
        cropX.value = '0';
        cropY.value = '0';
        cropWidth.value = Math.floor(canvas.width / 2);
        cropHeight.value = Math.floor(canvas.height / 2);

        updateCropRectangle();
        util.showMenu('cropMenu');
        app.tool = 'crop';
    });

    const cancelCrop = function() {
        cropCanvas.style.display = 'none';
        util.showMenu('mainMenu');
        app.tool = 'none';
    };

    const applyCrop = function() {
        const x = parseInt(cropX.value);
        const y = parseInt(cropY.value);
        const w = parseInt(cropWidth.value);
        const h = parseInt(cropHeight.value);
        const img = ctx.getImageData(x, y, w, h);

        app.currentZoomRatio = w / app.originalWidth;
        app.setZoom(app.currentZoom);
        canvas.width = w;
        canvas.height = h;
        ctx.putImageData(img, 0, 0);
        cancelCrop();
        app.setZoom(app.currentZoom);
    };

    util.listen(ui.cancelCropBtn, 'click', cancelCrop);
    util.listen(ui.confirmCropBtn, 'click', applyCrop);
    util.listen(window, 'keydown', function(e) {
        if (app.tool === 'crop') {
            if (e.keyCode === 13) { //enter
                applyCrop();
            }
            if (e.keyCode === 27) { //esc
                cancelCrop();
            }
        }
    });

    const calculateCropRectangle = function(pt1, pt2) {
        let startPoint;
        let width;
        let height;
        if (pt1.x < pt2.x && pt1.y < pt2.y) {
            // nw to se
            startPoint = pt1;
            width = pt2.x - pt1.x;
            height = pt2.y - pt1.y;
        } else if (pt1.x > pt2.x && pt1.y < pt2.y) {
            // ne to sw
            width = pt1.x - pt2.x;
            height = pt2.y - pt1.y;
            startPoint = {
                x: pt1.x - width,
                y: pt1.y
            };
        } else if (pt1.x > pt2.x && pt1.y > pt2.y) {
            // se to nw
            startPoint = pt2;
            width = pt1.x - pt2.x;
            height = pt1.y - pt2.y;
        } else {
            // sw to ne
            width = pt2.x - pt1.x;
            height = pt1.y - pt2.y;
            startPoint = {
                x: pt1.x,
                y: pt1.y - height
            };
        }
        return {
            startPoint: startPoint,
            width: width + 1,
            height: height + 1
        };
    };

    let mouseDown = false;
    let firstPoint;
    document.addEventListener('mousedown', function(e) {
        const target = e.target;
        if (target.nodeName === 'CANVAS' && app.tool === 'crop') {
            mouseDown = true;
            firstPoint = util.getCanvasPixelFromMouseEvent(e);
            cropX.value = firstPoint.x;
            cropY.value = firstPoint.y;
            cropWidth.value = 1;
            cropHeight.value = 1;
            updateCropRectangle();
        }
    });
    document.addEventListener('mousemove', function(e) {
        if (!mouseDown) {
            return;
        }
        const target = e.target;
        if (target.nodeName === 'CANVAS' && app.tool === 'crop') {
            mouseDown = true;
            const secondPoint = util.getCanvasPixelFromMouseEvent(e);
            const rect = calculateCropRectangle(firstPoint, secondPoint);
            cropX.value = rect.startPoint.x;
            cropY.value = rect.startPoint.y;
            cropWidth.value = rect.width;
            cropHeight.value = rect.height;
            updateCropRectangle();
        }
    });
    document.addEventListener('mouseup', function(e) {
        mouseDown = false;
    });

    document.addEventListener('keydown', function(e) {
        if (app.tool !== 'crop') {
            return;
        }
        e.preventDefault();
        if (e.which === 37) { // Left
            cropX.value = parseInt(cropX.value) - 1;
        }
        if (e.which === 38) { // Up
            cropY.value = parseInt(cropY.value) - 1;
        }
        if (e.which === 39) { // Right
            cropX.value = parseInt(cropX.value) + 1;
        }
        if (e.which === 40) { // Down
            cropY.value = parseInt(cropY.value) + 1;
        }
    });

    setInterval(function() {
        if (app.tool === 'crop') {
            currentColor = (currentColor + 24) % 511;
            let realColor = currentColor;
            if (currentColor > 255) {
                realColor = 510 - currentColor;
            }
            let hex = realColor.toString(16);
            if (hex.length === 1) {
                hex = '0' + hex;
            }
            cropSquareColor = '#' + hex + hex + hex;
            updateCropRectangle();
        }
    }, 100);
})(this);

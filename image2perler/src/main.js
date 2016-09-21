(function(global) {
    'use strict';

    global.app = global.app || {};
    const app = global.app;
    const ui = app.ui;
    const util = app.util;

    const canvas = ui.canvas;
    const ctx = ui.canvas.getContext('2d');

    app.originalWidth = 0;
    app.currentZoom = 100;
    app.currentZoomRatio = 1;
    app.pixelRatio = 1;

    function drawImageOnCanvas(img) {
        app.originalWidth = img.width;
        canvas.width = img.width;
        canvas.height = img.height;
        app.currentZoom = 100;
        app.currentZoomRatio = 1;

        ui.fileSelect.value = '';

        ctx.drawImage(img, 0, 0);
        util.removeTransparency(ctx);
        app.setZoom(100);
    }

    // file open stuff
    const openModal = picoModal({
        content: '<button id="openFile">Open File</button>' +
            '<button id="openURL">Open URL</button>',
        closeButton: false
    }).afterCreate(function(modal) {
        app.$('#openFile').addEventListener('click', function() {
            modal.close();
            ui.fileSelect.click();
        });
        app.$('#openURL').addEventListener('click', function() {
            modal.close();
            const url = prompt('Paste in the URL of the image (max file size 2MB):');
            if (url) {
                ui.overlay.style.display = 'block';
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = 'https://crossorigin.me/' + url;
                img.onload = function() {
                    drawImageOnCanvas(img);
                    ui.overlay.style.display = 'none';
                };
                img.onerror = function() {
                    alert('Failed to load the image... This feature uses https://crossorigin.me/ ' +
                        'to get around CORS. That site might be down. Or maybe an invalid url was ' +
                        'entered. OR the file was over 2MB.');
                    ui.overlay.style.display = 'none';
                };
            }
        });
    });
    util.listen(ui.openBtn, 'click', function() {
        openModal.show();
    });

    util.listen(ui.fileSelect, 'change', function() {
        const file = ui.fileSelect.files[0];
        const fr = new FileReader();
        fr.readAsDataURL(file);

        util.listen(fr, 'load', function() {
            const img = new Image();
            img.src = fr.result;

            util.listen(img, 'load', function() {
                drawImageOnCanvas(img);
            });
        });
    });

})(this);

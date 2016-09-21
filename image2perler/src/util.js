(function(global) {
    'use strict';

    global.app = global.app || {};
    const app = global.app;

    app.$ = document.querySelector.bind(document);
    app.$$ = document.querySelectorAll.bind(document);

    NodeList.prototype.forEach = Array.prototype.forEach;

    app.ui = {};

    // get all UI elements.
    app.$$('*[id]').forEach(function(el) {
        app.ui[el.id] = el;
    });

    const canvasClickHandlers = [];
    const mid = app.ui.mid;
    const rect = mid.getBoundingClientRect();

    app.util = {
        listen: function(node, events, fn) {
            events.split(' ').forEach(function(e) {
                node.addEventListener(e, fn);
            });
        },
        doASAP: function(fn) {
            setTimeout(fn, 0);
        },
        drawRect: function(ctx, x, y, w, h) {
            w -= 1;
            h -= 1;
            ctx.fillRect(x, y, w, 1);
            ctx.fillRect(x, y, 1, h);
            ctx.fillRect(x + w, y, 1, h);
            ctx.fillRect(x, y + h, w + 1, 1);
        },
        clearCanvas: function(ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        },
        removeTransparency: function(ctx) {
            const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
            const data = imageData.data;

            for (let x = 0, len = data.length; x < len; x += 4) {
                let alpha = data[x + 3] / 255;
                const whiteBlend = 255 * (1 - alpha);
                data[x] = data[x] * alpha + whiteBlend;
                data[x + 1] = data[x + 1] * alpha + whiteBlend;
                data[x + 2] = data[x + 2] * alpha + whiteBlend;
                data[x + 3] = 255;
            }

            ctx.putImageData(imageData, 0, 0);
        },
        showMenu: function(id) {
            app.$$('#topBar .menu').forEach(function(menu) {
                menu.style.display = 'none';
            });
            app.$(`#${id}`).style.display = 'block';
        },
        onCanvasClick: function(fn) {
            canvasClickHandlers.push(fn);
        },
        error: function(e) {
            if (e.stack) {
                console.error('===== Printing stack =====');
                console.error(e.stack);
            }
            console.error(e);
        },
        getCanvasPixelFromMouseEvent: function(e) {
            return {
                x: Math.floor((e.pageX + mid.scrollLeft) * app.pixelRatio),
                y: Math.floor((e.pageY - rect.top + mid.scrollTop) * app.pixelRatio)
            };
        }
    };

    document.addEventListener('click', function(e) {
        const target = e.target;
        if (target.nodeName === 'CANVAS') {
            const realPoint = app.util.getCanvasPixelFromMouseEvent(e);
            for (let x = 0, len = canvasClickHandlers.length; x < len; x++) {
                canvasClickHandlers[x](realPoint);
            }
        }
    });
})(this);

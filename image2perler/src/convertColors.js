(function(global) {
    'use strict';

    global.app = global.app || {};
    const app = global.app;
    const ui = app.ui;
    const util = app.util;

    const canvas = ui.canvas;
    const ctx = canvas.getContext('2d');

    const colorComparer = app.colorComparer();

    const findClosestBead = function(r, g, b) {
        let bestBead;
        let bestScore = Infinity;
        let x = app.beads.length;
        while (x-- > 0) {
            const bead = app.beads[x];
            const score = colorComparer.compareColors(r, g, b, bead.r, bead.g, bead.b);
            if (score < bestScore) {
                bestScore = score;
                bestBead = bead;
            }
        }
        return bestBead;
    };

    // WebWorker main function
    /* global self */
    const workerFunc = function() {
        self.colorComparer = app.colorComparer();

        self.onmessage = function(e) {
            const data = e.data;

            const pixelData = new Uint8Array(data.buffer);
            for (let x = 0, len = pixelData.length; x < len; x += 4) {
                if (pixelData[x + 3] === 255) {
                    const closestBead = app.findClosestBead(pixelData[x], pixelData[x + 1], pixelData[x + 2]);
                    pixelData[x] = closestBead.r;
                    pixelData[x + 1] = closestBead.g;
                    pixelData[x + 2] = closestBead.b;
                } else {
                    pixelData[x + 3] = 0;
                }
            }

            self.postMessage({
                buffer: pixelData.buffer
            }, [pixelData.buffer]);

            self.close();
        };
    };

    const multiConvertColors = function() {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const dataArr = imageData.data;

        const workerSrc = app.worker.createWorkerSource(workerFunc, {
            app: {
                colorComparer: app.colorComparer,
                findClosestBead: findClosestBead,
                beads: app.beads
            }
        });

        const cores = navigator.hardwareConcurrency || 2;

        const createWorker = function(chunkSize, offset) {
            return new Promise(function(res) {
                const worker = new Worker(workerSrc);
                const currentPixelIdx = offset * canvas.width * 4;
                const chunkLength = chunkSize * canvas.width * 4;
                const chunk = dataArr.slice(currentPixelIdx, currentPixelIdx + chunkLength);

                worker.onmessage = function(e) {
                    const pixelData = new Uint8ClampedArray(e.data.buffer);
                    const image = ctx.createImageData(canvas.width, chunkSize);
                    const imageArr = image.data;

                    imageArr.set(pixelData);
                    ctx.putImageData(image, 0, offset);

                    res();
                };

                worker.postMessage({
                    buffer: chunk.buffer
                }, [chunk.buffer]);
            });
        };

        return Promise.all(app.worker.distribute(canvas.height, cores, createWorker));
    };

    util.listen(ui.convertBtn, 'click', function() {
        ui.overlay.style.display = 'block';
        console.time('Converting colors...');
        multiConvertColors().then(function() {
            console.timeEnd('Converting colors...');
            ui.overlay.style.display = 'none';
        }).catch(util.error);
    });

})(this);

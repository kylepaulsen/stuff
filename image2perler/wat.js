var x = `${window.innerWidth}`;

(function() {
    var assignVarPath = function(path, value) {
        var pathParts = path.split('.');
        var currentObj = window;
        var testObj;
        for (var idx = 0, pathLen = pathParts.length - 1; idx < pathLen; ++idx) {
            testObj = currentObj[pathParts[idx]];
            if (typeof testObj !== 'object') {
                currentObj[pathParts[idx]] = {};
            }
            currentObj = currentObj[pathParts[idx]];
        }
        currentObj[pathParts.pop()] = value;
    };
})();

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

(function(global) {
    'use strict';

    global.app = global.app || {};
    const app = global.app;

    app.worker = {};

    // creates a web worker object url to be passed into new Worker();
    // mainFn is the main function that will run at the very end of the script.
    // env is an object that will have it's properties put in the global scope of
    // the worker. JSON types and functions are allowed in this object.
    app.worker.createWorkerSource = function(mainFn, env) {
        env = env || {};
        const runFunction = function(fn) {
            return '(' + fn.toString() + ')();\n';
        };

        // Using a special utf8 character in the third party zone to help
        // find where functions are defined in the stringified env object.
        const specialChar = '\uf8ff';
        let envString = JSON.stringify(env, function(k, v) {
            if (typeof v === 'function') {
                return specialChar + v.toString() + specialChar;
            }
            return v;
        });

        // need to convert stringified functions back into normal functions.
        let fnParts = envString.split('"' + specialChar);
        for (let x = 1, len = fnParts.length; x < len; x++) {
            const part = fnParts[x];
            const srcParts = part.split(specialChar + '"');
            srcParts[0] = srcParts[0].replace(/\\\\/g, specialChar)
                .replace(/\\"/g, '"').replace(new RegExp(specialChar, 'g'), '\\')
                .replace(/\/\/.*?\\n/g, '\n').replace(/\\r|\\n/g, '\n');
            fnParts[x] = srcParts.join('');
        }

        envString = fnParts.join('');

        /* global self */
        const defineVars = function() {
            Object.keys(env).forEach(function(key) {
                self[key] = env[key];
            });
        };

        let src = '"use strict"; self.window = self; var env = ' + envString + ';\n';
        src += runFunction(defineVars);
        src += runFunction(mainFn);

        const blob = new Blob([src], {type: 'text/javascript'});
        return window.URL.createObjectURL(blob);
    };

    // a function to help group data so that we can balance work among workers.
    // num is the total number of objects to be processed.
    // groups should probably be the number of workers you will be using.
    // fn is the callback that will contain the number of items in the current group
    // and the offset that describes how "far in" the data we are.
    app.worker.distribute = function(num, groups, fn) {
        const ans = [];
        const base = Math.floor(num / groups);
        let remainder = num % groups;
        let offset = 0;
        while (groups-- > 0) {
            let x = base;
            if (remainder-- > 0) {
                x++;
            }
            ans.push(fn(x, offset));
            offset += x;
        }
        return ans;
    };
})(this);

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

    let inCropMode = false;
    let cropSquareColor = '#000000';
    let currentColor = 0;


    const updateCropRectangle = function() {
        const x = parseInt(ui.cropX.value);
        const y = parseInt(ui.cropY.value);
        const w = parseInt(ui.cropWidth.value);
        const h = parseInt(ui.cropHeight.value);
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
        inCropMode = true;
    });

    util.listen(ui.cancelCropBtn, 'click', function() {
        cropCanvas.style.display = 'none';
        util.showMenu('mainMenu');
        inCropMode = false;
    });

    util.listen(ui.confirmCropBtn, 'click', function() {
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
        cropCanvas.style.display = 'none';
        util.showMenu('mainMenu');
        inCropMode = false;
        app.setZoom(app.currentZoom);
    });

    util.onCanvasClick(function(pixel) {
        if (inCropMode) {
            cropX.value = pixel.x;
            cropY.value = pixel.y;
            updateCropRectangle();
        }
    });

    setInterval(function() {
        if (inCropMode) {
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

(function(global) {
    'use strict';

    /*
    This file heavily uses the code from:
    https://github.com/THEjoezack/ColorMine

    Used this page to test:
    http://colormine.org/delta-e-calculator/cie2000
    */

    global.app = global.app || {};
    const app = global.app;

    app.colorComparer = function() {
        const rgbToXyz = function(r, g, b) {
            const pivotRGB = function(val) {
                if (val > 0.04045) {
                    return Math.pow((val + 0.055) / 1.055, 2.4) * 100;
                } else {
                    return 100 * val / 12.92;
                }
            };

            r = pivotRGB(r / 255);
            g = pivotRGB(g / 255);
            b = pivotRGB(b / 255);

            return {
                x: r * 0.4124 + g * 0.3576 + b * 0.1805,
                y: r * 0.2126 + g * 0.7152 + b * 0.0722,
                z: r * 0.0193 + g * 0.1192 + b * 0.9505
            };
        };

        const xyzToLab = function(x, y, z) {
            const whiteRef = {
                x: 95.047,
                y: 100,
                z: 108.883
            };
            const epsilon = 0.008856;
            const kappa = 903.3;

            const pivotXyz = function(val) {
                if (val > epsilon) {
                    return Math.pow(val, 1 / 3);
                } else {
                    return (kappa * val + 16) / 116;
                }
            };

            x = pivotXyz(x / whiteRef.x);
            y = pivotXyz(y / whiteRef.y);
            z = pivotXyz(z / whiteRef.z);

            return {
                l: Math.max(0, 116 * y - 16),
                a: 500 * (x - y),
                b: 200 * (y - z)
            };
        };

        const rgbToLab = function(r, g, b) {
            const xyz = rgbToXyz(r, g, b);
            return xyzToLab(xyz.x, xyz.y, xyz.z);
        };

        const radToDeg = 180 / Math.PI;
        const degToRad = 1 / radToDeg;

        // CieDe2000
        const colorDiff = function(r1, g1, b1, r2, g2, b2) {
            // weights
            const k_L = 1;
            const k_C = 1;
            const k_H = 1;

            const lab1 = rgbToLab(r1, g1, b1);
            const lab2 = rgbToLab(r2, g2, b2);

            const c_star_1_ab = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
            const c_star_2_ab = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
            const c_star_average_ab = (c_star_1_ab + c_star_2_ab) / 2;

            let c_star_average_ab_pot7 = c_star_average_ab * c_star_average_ab * c_star_average_ab;
            c_star_average_ab_pot7 *= c_star_average_ab_pot7 * c_star_average_ab;

            const G = 0.5 * (1 - Math.sqrt(c_star_average_ab_pot7 / (c_star_average_ab_pot7 + 6103515625)));
            const a1_prime = (1 + G) * lab1.a;
            const a2_prime = (1 + G) * lab2.a;

            const C_prime_1 = Math.sqrt(a1_prime * a1_prime + lab1.b * lab1.b);
            const C_prime_2 = Math.sqrt(a2_prime * a2_prime + lab2.b * lab2.b);
            //Angles in Degree.
            const h_prime_1 = ((Math.atan2(lab1.b, a1_prime) * radToDeg) + 360) % 360;
            const h_prime_2 = ((Math.atan2(lab2.b, a2_prime) * radToDeg) + 360) % 360;

            const delta_L_prime = lab2.l - lab1.l;
            const delta_C_prime = C_prime_2 - C_prime_1;

            const h_bar = Math.abs(h_prime_1 - h_prime_2);
            let delta_h_prime;
            if (C_prime_1 * C_prime_2 === 0) {
                delta_h_prime = 0;
            } else {
                if (h_bar <= 180) {
                    delta_h_prime = h_prime_2 - h_prime_1;
                } else if (h_bar > 180 && h_prime_2 <= h_prime_1) {
                    delta_h_prime = h_prime_2 - h_prime_1 + 360;
                } else {
                    delta_h_prime = h_prime_2 - h_prime_1 - 360;
                }
            }
            const delta_H_prime = 2 * Math.sqrt(C_prime_1 * C_prime_2) * Math.sin(delta_h_prime * Math.PI / 360);

            // Calculate CIEDE2000
            const L_prime_average = (lab1.l + lab2.l) / 2;
            const C_prime_average = (C_prime_1 + C_prime_2) / 2;

            //Calculate h_prime_average
            let h_prime_average;
            if (C_prime_1 * C_prime_2 === 0) {
                h_prime_average = 0;
            } else {
                if (h_bar <= 180) {
                    h_prime_average = (h_prime_1 + h_prime_2) / 2;
                } else if (h_bar > 180 && (h_prime_1 + h_prime_2) < 360) {
                    h_prime_average = (h_prime_1 + h_prime_2 + 360) / 2;
                } else {
                    h_prime_average = (h_prime_1 + h_prime_2 - 360) / 2;
                }
            }

            let L_prime_average_minus_50_square = (L_prime_average - 50);
            L_prime_average_minus_50_square *= L_prime_average_minus_50_square;

            const S_L = 1 + ((0.015 * L_prime_average_minus_50_square) /
                Math.sqrt(20 + L_prime_average_minus_50_square));
            const S_C = 1 + 0.045 * C_prime_average;
            const T = 1 -
                0.17 * Math.cos(degToRad * (h_prime_average - 30)) +
                0.24 * Math.cos(degToRad * (h_prime_average * 2)) +
                0.32 * Math.cos(degToRad * (h_prime_average * 3 + 6)) -
                0.2 * Math.cos(degToRad * (h_prime_average * 4 - 63));
            const S_H = 1 + 0.015 * T * C_prime_average;
            let h_prime_average_minus_275_div_25_square = (h_prime_average - 275) / 25;
            h_prime_average_minus_275_div_25_square *= h_prime_average_minus_275_div_25_square;
            const delta_theta = 30 * Math.exp(-h_prime_average_minus_275_div_25_square);

            let C_prime_average_pot_7 = C_prime_average * C_prime_average * C_prime_average;
            C_prime_average_pot_7 *= C_prime_average_pot_7 * C_prime_average;
            const R_C = 2 * Math.sqrt(C_prime_average_pot_7 / (C_prime_average_pot_7 + 6103515625));

            const R_T = -Math.sin(degToRad * (2 * delta_theta)) * R_C;

            const delta_L_prime_div_k_L_S_L = delta_L_prime / (S_L * k_L);
            const delta_C_prime_div_k_C_S_C = delta_C_prime / (S_C * k_C);
            const delta_H_prime_div_k_H_S_H = delta_H_prime / (S_H * k_H);

            // CIEDE2000
            return Math.sqrt(
                delta_L_prime_div_k_L_S_L * delta_L_prime_div_k_L_S_L +
                delta_C_prime_div_k_C_S_C * delta_C_prime_div_k_C_S_C +
                delta_H_prime_div_k_H_S_H * delta_H_prime_div_k_H_S_H +
                R_T * delta_C_prime_div_k_C_S_C * delta_H_prime_div_k_H_S_H
            );
        };

        return {
            compareColors: colorDiff
        };
    };
})(this);

(function(global) {
    'use strict';

    // got color data from here:
    // https://docs.google.com/spreadsheets/d/1f988o68HDvk335xXllJD16vxLBuRcmm3vg6U9lVaYpA/edit#gid=0
    // I removed special beads by commenting them. (glow, metal, transparent)

    // Some code to help parse a copy-paste from that sheet:
    /*
    var colors = [];
    sheetString.split("\n").forEach(function(data) {
        var d = data.split("\t");
        colors.push({
            name: d[0],
            r: parseInt(d[2]),
            g: parseInt(d[3]),
            b: parseInt(d[4])
        });
    });
    JSON.stringify(colors);
    */

    global.app = global.app || {};
    const app = global.app;

    app.beads = [
        {
            name: 'White',
            r: 241,
            g: 241,
            b: 241
        },
        {
            name: 'Cream',
            r: 224,
            g: 222,
            b: 169
        },
        {
            name: 'Yellow',
            r: 236,
            g: 216,
            b: 0
        },
        {
            name: 'Orange',
            r: 237,
            g: 97,
            b: 32
        },
        {
            name: 'Red',
            r: 191,
            g: 46,
            b: 64
        },
        {
            name: 'Bubblegum',
            r: 221,
            g: 102,
            b: 155
        },
        {
            name: 'Purple',
            r: 96,
            g: 64,
            b: 137
        },
        {
            name: 'Dark Blue',
            r: 43,
            g: 63,
            b: 135
        },
        {
            name: 'Dark Green',
            r: 28,
            g: 117,
            b: 62
        },
        {
            name: 'Pearl Coral',
            r: 249,
            g: 126,
            b: 121
        },
        {
            name: 'Pearl Light Blue',
            r: 122,
            g: 174,
            b: 162
        },
        {
            name: 'Pearl Green',
            r: 132,
            g: 183,
            b: 145
        },
        {
            name: 'Pearl Yellow',
            r: 202,
            g: 192,
            b: 51
        },
        {
            name: 'Pearl Light Pink',
            r: 215,
            g: 168,
            b: 162
        },
        // {
        //     name: 'Silver',
        //     r: 119,
        //     g: 123,
        //     b: 129
        // },
        {
            name: 'Light Green',
            r: 86,
            g: 186,
            b: 159
        },
        {
            name: 'Brown',
            r: 81,
            g: 57,
            b: 49
        },
        {
            name: 'Grey',
            r: 138,
            g: 141,
            b: 145
        },
        {
            name: 'Black',
            r: 46,
            g: 47,
            b: 50
        },
        {
            name: 'Rust',
            r: 140,
            g: 55,
            b: 44
        },
        {
            name: 'Light Brown',
            r: 129,
            g: 93,
            b: 52
        },
        {
            name: 'Tan',
            r: 188,
            g: 147,
            b: 113
        },
        {
            name: 'Magenta',
            r: 242,
            g: 42,
            b: 123
        },
        // {
        //     name: 'Neon Yellow',
        //     r: 220,
        //     g: 224,
        //     b: 2
        // },
        // {
        //     name: 'Neon Orange',
        //     r: 255,
        //     g: 119,
        //     b: 0
        // },
        // {
        //     name: 'Neon Green',
        //     r: 1,
        //     g: 158,
        //     b: 67
        // },
        // {
        //     name: 'Neon Pink',
        //     r: 255,
        //     g: 57,
        //     b: 145
        // },
        {
            name: 'Pastel Blue',
            r: 83,
            g: 144,
            b: 209
        },
        {
            name: 'Pastel Green',
            r: 118,
            g: 200,
            b: 130
        },
        {
            name: 'Pastel Lavender',
            r: 138,
            g: 114,
            b: 193
        },
        {
            name: 'Pastel Yellow',
            r: 254,
            g: 248,
            b: 117
        },
        {
            name: 'Chedder',
            r: 241,
            g: 170,
            b: 12
        },
        {
            name: 'Toothpaste',
            r: 147,
            g: 200,
            b: 212
        },
        {
            name: 'Hot Coral',
            r: 255,
            g: 56,
            b: 81
        },
        {
            name: 'Plum',
            r: 162,
            g: 75,
            b: 156
        },
        {
            name: 'Kiwi Lime',
            r: 108,
            g: 190,
            b: 19
        },
        {
            name: 'Cyan',
            r: 43,
            g: 137,
            b: 198
        },
        {
            name: 'Blush',
            r: 255,
            g: 130,
            b: 133
        },
        {
            name: 'Light Blue',
            r: 51,
            g: 112,
            b: 192
        },
        {
            name: 'Periwinkle Blue',
            r: 100,
            g: 124,
            b: 190
        },
        // {
        //     name: 'Glow Green',
        //     r: 190,
        //     g: 198,
        //     b: 150
        // },
        {
            name: 'Light Pink',
            r: 246,
            g: 179,
            b: 221
        },
        {
            name: 'Bright Green',
            r: 79,
            g: 173,
            b: 66
        },
        {
            name: 'Peach',
            r: 238,
            g: 186,
            b: 178
        },
        {
            name: 'Pink',
            r: 228,
            g: 72,
            b: 146
        },
        // {
        //     name: 'Gold',
        //     r: 187,
        //     g: 118,
        //     b: 52
        // },
        {
            name: 'Raspberry',
            r: 165,
            g: 48,
            b: 97
        },
        {
            name: 'Butterscotch',
            r: 212,
            g: 132,
            b: 55
        },
        {
            name: 'Parrot Green',
            r: 6,
            g: 124,
            b: 129
        },
        {
            name: 'Dark Grey',
            r: 77,
            g: 81,
            b: 86
        },
        {
            name: 'Blueberry Cream',
            r: 130,
            g: 151,
            b: 217
        },
        {
            name: 'Cranapple',
            r: 128,
            g: 50,
            b: 69
        },
        {
            name: 'Prickly Pear',
            r: 189,
            g: 218,
            b: 1
        },
        {
            name: 'Sand',
            r: 228,
            g: 182,
            b: 144
        }
    ];

})(this);

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
                    const pixelData = new Uint8Array(e.data.buffer);
                    const image = ctx.createImageData(canvas.width, chunkSize);
                    const imageArr = image.data;

                    var x = image.data.length;
                    while (x-- > 0) {
                        imageArr[x] = pixelData[x];
                    }
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

    // file open stuff
    util.listen(ui.openBtn, 'click', function() {
        ui.fileSelect.click();
    });

    util.listen(ui.fileSelect, 'change', function() {
        const file = ui.fileSelect.files[0];
        const fr = new FileReader();
        fr.readAsDataURL(file);

        util.listen(fr, 'load', function() {
            const img = new Image();
            img.src = fr.result;

            util.listen(img, 'load', function() {
                app.originalWidth = img.width;
                canvas.width = img.width;
                canvas.height = img.height;
                app.currentZoom = 100;
                app.currentZoomRatio = 1;

                ui.fileSelect.value = '';

                ctx.drawImage(img, 0, 0);
                util.removeTransparency(ctx);
                app.setZoom(100);
            });
        });
    });

})(this);



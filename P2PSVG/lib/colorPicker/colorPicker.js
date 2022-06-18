function makeColorPicker(options = {}) {
    const hasAlpha = options.alpha ?? true;
    const showInputs = options.showInputs ?? false;
    const markup = `
        <div class="color-picker-sliders">
            <div class="color-square" data-id="satContainer">
                <div class="duckness" data-id="duckness"></div>
                <div class="color-circle" data-id="colorCircle"></div>
            </div>
            <div class="hue-picker" data-id="hueContainer">
                <div class="color-line" data-id="hueLine"></div>
            </div>
            <div class="alpha-picker" data-id="alphaContainer">
                <div class="alpha-color" data-id="alphaColor"></div>
                <div class="color-line" data-id="alphaLine"></div>
            </div>
        </div>
        <div class="color-picker-inputs" data-id="colorInputs">
            <div class="color-input">
                <div>Red</div>
                <input type="number" data-id="red" min="0" max="255" step="1" value="0" />
            </div>
            <div class="color-input">
                <div>Green</div>
                <input type="number" data-id="green" min="0" max="255" step="1" value="0" />
            </div>
            <div class="color-input">
                <div>Blue</div>
                <input type="number" data-id="blue" min="0" max="255" step="1" value="0" />
            </div>
            <div class="color-input">
                <div>Alpha</div>
                <input type="number" data-id="alpha" min="0" max="1" step="0.01" value="1" />
            </div>
        </div>
    `;
    const container = document.createElement('div');
    container.innerHTML = markup;
    container.className = 'color-picker';

    const ui = {};
    container.querySelectorAll('[data-id]').forEach((item) => {
        ui[item.dataset.id] = item;
    });

    if (!hasAlpha) {
        ui.alphaContainer.style.display = 'none';
        ui.colorInputs.children[3].remove();
        ui.colorInputs.style.width = "180px";
    }
    if (!showInputs) {
        ui.colorInputs.style.display = 'none';
    }

    ui.hueLine.style.top = '0%';
    ui.alphaLine.style.top = '0%';
    ui.colorCircle.style.left = '0%';
    ui.colorCircle.style.top = '100%';

    const setupAlpha = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#666666';
        ctx.fillRect(0, 0, 5, 5);
        ctx.fillRect(5, 5, 5, 5);
        ui.alphaContainer.style.background = `url(${canvas.toDataURL()})`;
    };
    setupAlpha();

    const invLerp = (a, b, val) => {
        const total = b - a;
        const p = (val - a) / total;
        return Math.min(Math.max(p, 0), 1);
    };

    const hsvToRgb = (h, s, v) => {
        let r; let g; let b; let i; let f; let p; let q; let t;
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    };

    const rgbToHsv = (r, g, b) => {
        let max = Math.max(r, g, b); let min = Math.min(r, g, b);
            let d = max - min;
            let h;
            let s = (max === 0 ? 0 : d / max);
            let v = max / 255;

        switch (max) {
            case min: h = 0; break;
            case r: h = (g - b) + d * (g < b ? 6 : 0); h /= 6 * d; break;
            case g: h = (b - r) + d * 2; h /= 6 * d; break;
            case b: h = (r - g) + d * 4; h /= 6 * d; break;
        }

        return {
            h: h,
            s: s,
            v: v
        };
    };

    const triggerChange = () => {
        const h = parseFloat(ui.hueLine.style.top) / 100;
        const s = parseFloat(ui.colorCircle.style.left) / 100;
        const v = 1 - parseFloat(ui.colorCircle.style.top) / 100;
        const rgb = hsvToRgb(h, s, v);
        rgb.a = 1 - parseFloat(ui.alphaLine.style.top) / 100;
        ui.red.value = rgb.r;
        ui.green.value = rgb.g;
        ui.blue.value = rgb.b;
        ui.alpha.value = rgb.a;
        onChangeFns.forEach((fn) => {
            fn(rgb);
        });
    };

    const changeSatDark = (e) => {
        const box = ui.satContainer.getBoundingClientRect();
        const x = e.clientX - box.left;
        const y = e.clientY - box.top;
        const h = parseFloat(ui.hueLine.style.top) / 100;
        const s = invLerp(0, ui.satContainer.offsetWidth, x);
        const v = invLerp(0, ui.satContainer.offsetHeight, y);
        const rgb = hsvToRgb(h, s, 1 - v);
        if (v < 0.5) {
            ui.colorCircle.style.border = '2px solid #000';
        } else {
            ui.colorCircle.style.border = '2px solid #fff';
        }
        ui.colorCircle.style.left = s * 100 + '%';
        ui.colorCircle.style.top = v * 100 + '%';
        ui.alphaColor.style.background = 'linear-gradient(to top, rgba(0,0,0,0), ' +
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
        triggerChange();
    };

    const changeHue = (e) => {
        const box = ui.hueContainer.getBoundingClientRect();
        const y = e.clientY - box.top;
        const h = invLerp(0, ui.hueContainer.offsetHeight, y);
        const s = parseFloat(ui.colorCircle.style.left) / 100;
        const v = 1 - parseFloat(ui.colorCircle.style.top) / 100;
        const rgb = hsvToRgb(h, s, v);
        ui.hueLine.style.top = h * 100 + '%';
        const color = hsvToRgb(h, 1, 1);
        ui.satContainer.style.background = 'linear-gradient(to right, rgb(255, 255, 255), ' +
            `rgb(${color.r}, ${color.g}, ${color.b}))`;
        ui.alphaColor.style.background = 'linear-gradient(to top, rgba(0,0,0,0), ' +
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
        triggerChange();
    };

    const changeAlpha = (e) => {
        const box = ui.alphaContainer.getBoundingClientRect();
        const y = e.clientY - box.top;
        const yp = invLerp(0, ui.alphaContainer.offsetHeight, y);
        ui.alphaLine.style.top = yp * 100 + '%';
        triggerChange();
    };

    const setupColorChange = () => {
        let changing;
        ui.satContainer.addEventListener('mousedown', (e) => {
            changing = 'sat';
            changeSatDark(e);
        });

        ui.hueContainer.addEventListener('mousedown', (e) => {
            changing = 'hue';
            changeHue(e);
        });

        ui.alphaContainer.addEventListener('mousedown', (e) => {
            changing = 'alpha';
            changeAlpha(e);
        });

        const inputChange = () => {
            setColor(parseInt(ui.red.value), parseInt(ui.green.value),
                parseInt(ui.blue.value), parseFloat(ui.alpha.value));
            triggerChange();
        };

        ui.red.addEventListener('input', inputChange);
        ui.green.addEventListener('input', inputChange);
        ui.blue.addEventListener('input', inputChange);
        ui.alpha.addEventListener('input', inputChange);

        window.addEventListener('mousemove', (e) => {
            if (changing === 'sat') {
                changeSatDark(e);
            } else if (changing === 'hue') {
                changeHue(e);
            } else if (changing === 'alpha') {
                changeAlpha(e);
            }
        });

        window.addEventListener('mouseup', () => {
            changing = undefined;
        });
    };
    setupColorChange();

    const onChangeFns = [];
    const onChange = (fn) => {
        onChangeFns.push(fn);
    };

    const setColor = (r, g, b, a = 1) => {
        const hsv = rgbToHsv(r, g, b);
        ui.colorCircle.style.left = hsv.s * 100 + '%';
        ui.colorCircle.style.top = (1 - hsv.v) * 100 + '%';
        ui.hueLine.style.top = hsv.h * 100 + '%';
        ui.alphaLine.style.top = (1 - a) * 100 + '%';
        const color = hsvToRgb(hsv.h, 1, 1);
        ui.satContainer.style.background = 'linear-gradient(to right, rgb(255, 255, 255), ' +
            `rgb(${color.r}, ${color.g}, ${color.b}))`;
        ui.alphaColor.style.background = 'linear-gradient(to top, rgba(0,0,0,0), ' +
            `rgba(${r}, ${g}, ${b}, 1)`;
        ui.red.value = r;
        ui.green.value = g;
        ui.blue.value = b;
        ui.alpha.value = a;
    };

    return {
        container,
        onChange,
        setColor
    };
}

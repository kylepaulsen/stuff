/* global makeShaderCanvas, dat */
const complexRootForm2PolyForm = (roots) => {
	const numRoots = roots.length;
	const invertedRoots = roots.map(a => [-a[0], -a[1]]);
	const numFoils = 2 ** numRoots;
	const coefficients = [];
	for (let p = 0; p < numRoots + 1; p++) {
		coefficients.push([0, 0]);
	}

	for (let foilIter = 0; foilIter < numFoils; foilIter++) {
		let power = 0;
		const coef = [1, 0];
		const foilPattern = foilIter.toString(2).padStart(numRoots, 0);
		for (let t = 0; t < numRoots; t++) {
			const isX = foilPattern[t] === '0';
			if (isX) {
				power++;
			} else {
				const iRoot = invertedRoots[t];
				const oldCoefReal = coef[0];
				coef[0] = coef[0] * iRoot[0] - coef[1] * iRoot[1];
				coef[1] = coef[1] * iRoot[0] + oldCoefReal * iRoot[1];
			}
		}
		const polyCoef = coefficients[power];
		polyCoef[0] += coef[0];
		polyCoef[1] += coef[1];
	}

	return coefficients;
};

const complexPolyDerivative = (coefficients) => {
	const derivativeCoefficients = [];
	for (let power = 1; power < coefficients.length; power++) {
		const coef = coefficients[power];
		derivativeCoefficients.push([coef[0] * power, coef[1] * power]);
	}
	return derivativeCoefficients;
};

const canvas = document.createElement('canvas');
const quality = 1;
const width = Math.floor(window.innerWidth * quality);
const height = Math.floor(window.innerHeight * quality);
const xmax = 5;
const xmin = -xmax;
const ymax = (xmax - xmin) * (height / width) * 0.5;
const ymin = -ymax;
// const xmax = 10;
// const xmin = -40;
// const ymax = 5;
// const ymin = -ymax;
const xSize = xmax - xmin;
const ySize = ymax - ymin;
canvas.width = width;
canvas.height = height;
canvas.style.width = '100%';
document.body.appendChild(canvas);

const shaderCanvas = makeShaderCanvas(canvas);
const buildShader = (iters = 30, numRoots = 8) => {
	const shaderSource = `
        #define ITERS ${iters}
        #define NUM_ROOTS ${numRoots}
        #define mul(a, b) vec2(a.x*b.x-a.y*b.y, a.x*b.y+a.y*b.x)
        #define div(a, b) vec2(((a.x*b.x+a.y*b.y)/(b.x*b.x+b.y*b.y)),((a.y*b.x-a.x*b.y)/(b.x*b.x+b.y*b.y)))

        precision mediump float;
        uniform int showRoots;
        uniform vec2 windowMin;
        uniform vec2 windowSize;
        uniform vec2 roots[NUM_ROOTS];
        uniform vec2 polyCoefs[NUM_ROOTS + 1];
        uniform vec2 polyDerivativeCoefs[NUM_ROOTS + 1];
        varying vec2 v_position;

        vec3 hsv2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        vec2 evaluateComplexPoly(vec2 coefs[NUM_ROOTS + 1], int totalCoefs, vec2 x) {
            vec2 ans = coefs[0];
            vec2 power = vec2(1., 0.);
            for (int t = 1; t < NUM_ROOTS + 1; ++t) {
                if (t >= totalCoefs) {
                    break;
                }
                vec2 coef = coefs[t];
                power = mul(power, x);
                ans += mul(coef, power);
            }
            return ans;
        }

        void main() {
            vec2 z0 = windowSize * v_position + windowMin;
            vec2 z = vec2(z0);
            int iter = 0;
            for (int t = 0; t < ITERS; ++t) {
                iter = t;
                vec2 f = evaluateComplexPoly(polyCoefs, NUM_ROOTS + 1, z);
                vec2 fp = evaluateComplexPoly(polyDerivativeCoefs, NUM_ROOTS, z);
                vec2 step = div(f, fp);
                if (dot(step, step) < 0.01) {
                    break;
                }
                z -= step;
            }
            int bestRootIdx = 0;
            float bestRootDist = 9999999.;
            for (int t = 0; t < NUM_ROOTS; ++t) {
                vec2 diff = z - roots[t];
                float dist = dot(diff, diff);
                if (dist < bestRootDist) {
                    bestRootDist = dist;
                    bestRootIdx = t;
                }
                vec2 z0Diff = z0 - roots[t];
                float z0Dist = dot(z0Diff, z0Diff);
                if (showRoots == 1 && z0Dist < windowSize.x * 0.001 && z0Dist > windowSize.x * 0.0005) {
                    gl_FragColor = vec4(1.);
                    return;
                }
            }
            // if (bestRootDist < 0.001) {
            //     gl_FragColor = vec4(0.);
            //     return;
            // }
            // vec3 hsv = vec3(float(bestRootIdx) / float(NUM_ROOTS), 1., 1. - (1. / float(ITERS)) * float(iter));
            vec3 hsv = vec3(float(bestRootIdx) / float(NUM_ROOTS), 1., 1. - pow(float(iter) / float(ITERS), 0.5));
            gl_FragColor = vec4(hsv2rgb(hsv), 1.);
        }
    `;
	const shaderProgram = shaderCanvas.createShaderProgramFromSource(shaderSource);
	shaderCanvas.prepareShader(shaderProgram);
	return shaderProgram;
};
let shaderProgram;

const iters = 30;
const roots = [];

let poly;
let polyDerivative;

const datGUIState = {
	rootWander: false,
	alwaysShowRoots: false
};

let mouseDown = false;
const render = () => {
	shaderCanvas.setShaderUniform(shaderProgram, 'uniform1i', 'showRoots',
		(mouseDown || datGUIState.alwaysShowRoots) ? 1 : 0);
	shaderCanvas.setShaderUniform(shaderProgram, 'uniform2f', 'windowMin', xmin, ymin);
	shaderCanvas.setShaderUniform(shaderProgram, 'uniform2f', 'windowSize', xSize, ySize);
	shaderCanvas.setShaderUniform(shaderProgram, 'uniform2fv', 'roots', roots.flat());
	shaderCanvas.setShaderUniform(shaderProgram, 'uniform2fv', 'polyCoefs', poly.flat());
	shaderCanvas.setShaderUniform(shaderProgram, 'uniform2fv', 'polyDerivativeCoefs', polyDerivative.flat());
	shaderCanvas.render();
};

let draggingRoot;
window.addEventListener('mousedown', (e) => {
	mouseDown = true;
	const point = [xSize * e.pageX / width + xmin, -ySize * e.pageY / height - ymin];
	let bestRoot;
	let bestRootDist = Infinity;
	roots.forEach(r => {
		const diff = [point[0] - r[0], point[1] - r[1]];
		const dist = diff[0] * diff[0] + diff[1] * diff[1];
		if (dist < bestRootDist) {
			bestRootDist = dist;
			bestRoot = r;
		}
	});
	if (bestRootDist < xSize * 0.001) {
		draggingRoot = bestRoot;
	}
	render();
});
window.addEventListener('mouseup', () => {
	mouseDown = false;
	draggingRoot = undefined;
	render();
});
let lastDragRender = 0;
window.addEventListener('mousemove', (e) => {
	const now = Date.now();
	const deltaDragRender = now - lastDragRender;
	if (draggingRoot && deltaDragRender > (1000 / 30)) {
		draggingRoot[0] = xSize * e.pageX / width + xmin;
		draggingRoot[1] = -ySize * e.pageY / height - ymin;
		poly = complexRootForm2PolyForm(roots);
		polyDerivative = complexPolyDerivative(poly);
		render();
		lastDragRender = now;
	}
});

const makeRandomRootVel = () => {
	const rootWanderSpeed = 0.3;
	const ang = 2 * Math.PI * Math.random();
	return [rootWanderSpeed * Math.cos(ang), rootWanderSpeed * Math.sin(ang)];
};

const addRoot = (shouldRender = true) => {
	const numRoots = roots.length;
	if (numRoots < 25) {
		const angleOffset = Math.floor(numRoots / 5);
		const starAngle = 360 / 5;
		const angle = (numRoots * starAngle + 90 + angleOffset * starAngle / 5) * Math.PI / 180;
		// roots.push([
		//     Math.random() * xSize + xmin,
		//     Math.random() * ySize + ymin
		// ]);
		const minSize = Math.min(xSize, ySize);
		roots.push([
			(0.3 * minSize * Math.cos(angle)),
			(0.3 * minSize * Math.sin(angle))
		]);
		if (shouldRender) {
			poly = complexRootForm2PolyForm(roots);
			polyDerivative = complexPolyDerivative(poly);
			shaderProgram = buildShader(iters, roots.length);
			render();
		}
	}
};

const removeRoot = () => {
	if (roots.length > 2) {
		roots.pop();
		poly = complexRootForm2PolyForm(roots);
		polyDerivative = complexPolyDerivative(poly);
		shaderProgram = buildShader(iters, roots.length);
		render();
	}
};

datGUIState.addRoot = addRoot;
datGUIState.removeRoot = removeRoot;

for (let x = 0; x < 5; x++) {
	addRoot(false);
}
shaderProgram = buildShader(iters, roots.length);
poly = complexRootForm2PolyForm(roots);
polyDerivative = complexPolyDerivative(poly);
render();

let rootVels = [];
let lastMS = 0;
const rootWander = (ms) => {
	requestAnimationFrame(rootWander);
	const delta = (ms - lastMS) / 1000;
	lastMS = ms;
	if (!datGUIState.rootWander) {
		return;
	}
	if (rootVels.length !== roots.length) {
		rootVels = roots.map(() => makeRandomRootVel());
	}
	roots.forEach((r, idx) => {
		const vel = rootVels[idx];
		r[0] += delta * vel[0];
		r[1] += delta * vel[1];
		let bounced = false;
		if (r[0] < xmin || r[0] > xmax) {
			vel[0] *= -1;
			bounced = true;
		}
		if (r[1] < ymin || r[1] > ymax) {
			vel[1] *= -1;
			bounced = true;
		}
		if (bounced && Math.random() < 0.2) {
			setTimeout(() => {
				rootVels[idx] = makeRandomRootVel();
			}, 1000);
		}
	});
	poly = complexRootForm2PolyForm(roots);
	polyDerivative = complexPolyDerivative(poly);
	render();
};
rootWander();

const gui = new dat.GUI();

gui.add(datGUIState, 'rootWander').name('Root Wander');
gui.add(datGUIState, 'alwaysShowRoots').name('Roots Visible').onChange(render);
gui.add(datGUIState, 'addRoot').name('Add Root');
gui.add(datGUIState, 'removeRoot').name('Remove Root');

gui.closed = true;

const guiContainer = document.querySelector('.dg.main');
guiContainer.style.transition = 'top 0.5s ease-in-out';
guiContainer.style.position = 'relative';
guiContainer.style.top = '0px';
let firstHide = false;
setTimeout(() => {
	firstHide = true;
	if (gui.closed) {
		guiContainer.style.top = '-20px';
	}
}, 2000);

window.addEventListener('mousemove', (e) => {
	if (e.pageX > window.innerWidth - 350 && e.pageY < 80) {
		guiContainer.style.top = '0px';
	} else if (gui.closed && firstHide) {
		guiContainer.style.top = '-20px';
	}
});

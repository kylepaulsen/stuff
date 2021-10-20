/* global makeShaderCanvas, dat */
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

		precision highp float;
		uniform int showRoots;
		uniform vec2 windowMin;
		uniform vec2 windowSize;
		uniform vec2 roots[NUM_ROOTS];
		varying vec2 v_position;

		vec3 hsv2rgb(vec3 c) {
			vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
			vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
			return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
		}

		vec2 div(vec2 a, vec2 b) {
			float denom = b.x * b.x + b.y * b.y;
			return vec2((a.x * b.x + a.y * b.y) / denom, (a.y * b.x - a.x * b.y) / denom);
		}

		vec2 evaluateComplexPoly(vec2 coefs[NUM_ROOTS], vec2 x) {
			vec2 ans = x - coefs[0];
			for (int t = 1; t < NUM_ROOTS; ++t) {
				ans *= (x - coefs[t]);
			}
			return ans;
		}

		vec2 evaluateComplexPolyDeriv(vec2 coefs[NUM_ROOTS], vec2 fResult, vec2 x) {
			vec2 ans = div(fResult, x - coefs[0]);
			for (int t = 1; t < NUM_ROOTS; ++t) {
				ans += div(fResult, x - coefs[t]);
			}
			return ans;
		}

		void main() {
			vec2 z0 = windowSize * v_position + windowMin;
			vec2 z = vec2(z0);
			int iter = 0;
			for (int t = 0; t < ITERS; ++t) {
				iter = t;
				vec2 f = evaluateComplexPoly(roots, z);
				vec2 fp = evaluateComplexPolyDeriv(roots, f, z);
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
			// 	gl_FragColor = vec4(0.);
			// 	return;
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

const datGUIState = {
	rootWander: false,
	wanderSpeed: 1,
	alwaysShowRoots: false,
};

let mouseDown = false;
const render = () => {
	shaderCanvas.setShaderUniform(shaderProgram, 'uniform1i', 'showRoots',
		(mouseDown || datGUIState.alwaysShowRoots) ? 1 : 0);
	shaderCanvas.setShaderUniform(shaderProgram, 'uniform2f', 'windowMin', xmin, ymin);
	shaderCanvas.setShaderUniform(shaderProgram, 'uniform2f', 'windowSize', xSize, ySize);
	shaderCanvas.setShaderUniform(shaderProgram, 'uniform2fv', 'roots', roots.flat());
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
		render();
		lastDragRender = now;
	}
});

const makeRandomRootVel = () => {
	const rootWanderSpeed = 0.8;
	const ang = 2 * Math.PI * Math.random();
	return [rootWanderSpeed * Math.cos(ang), rootWanderSpeed * Math.sin(ang)];
};

const addRoot = (shouldRender = true) => {
	const numRoots = roots.length;
	if (numRoots < 30) {
		const angleOffset = Math.floor(numRoots / 5);
		const starAngle = 360 / 5;
		const angle = (numRoots * starAngle + 90 + angleOffset * starAngle / 5) * Math.PI / 180;
		const minSize = Math.min(xSize, ySize);
		roots.push([
			(0.3 * minSize * Math.cos(angle)),
			(0.3 * minSize * Math.sin(angle))
		]);
		if (shouldRender) {
			shaderProgram = buildShader(iters, roots.length);
			render();
		}
	}
};

const removeRoot = () => {
	if (roots.length > 2) {
		roots.pop();
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
		let bounced = false;
		if (r[0] < xmin && vel[0] < 0) {
			r[0] = xmin;
			vel[0] *= -1;
			bounced = true;
		}
		if (r[0] > xmax && vel[0] > 0) {
			r[0] = xmax;
			vel[0] *= -1;
			bounced = true;
		}
		if (r[1] < ymin && vel[1] < 0) {
			r[1] = ymin;
			vel[1] *= -1;
			bounced = true;
		}
		if (r[1] > ymax && vel[1] > 0) {
			r[1] = ymax;
			vel[1] *= -1;
			bounced = true;
		}
		r[0] += delta * datGUIState.wanderSpeed * vel[0];
		r[1] += delta * datGUIState.wanderSpeed * vel[1];
		if (bounced && Math.random() < 0.1) {
			setTimeout(() => {
				rootVels[idx] = makeRandomRootVel();
			}, 1000);
		}
	});
	render();
};
rootWander();

const gui = new dat.GUI();

gui.add(datGUIState, 'rootWander').name('Root Wander');
gui.add(datGUIState, 'wanderSpeed', 0.1, 10, 0.1).name('Wander Speed');
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

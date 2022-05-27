import { clamp } from './util.js';
import ui from './ui.js';
import genCave from './caveGen/naturalCave.js';
import { tileId2Color, passableTiles } from './caveGen/tiles.js';
import makeFog from './fog.js';
import createSimulationEngine from './simulationEngine.js';
import createEntityTracker from './entityTracker.js';
import { randInt } from './random.js';

import createHero from './entities/hero.js';
import createMonster from './entities/monster.js';

const canvasWidth = 800;
const canvasHeight = 600;
const tileSize = 8;

const tilesColumns = Math.floor(canvasWidth / tileSize);
const tilesRows = Math.floor(canvasHeight / tileSize);

const canvas = ui.mainCanvas;
const ctx = canvas.getContext('2d');
canvas.ctx = ctx;

let canvasX = 0;
let canvasY = 0;
let canvasScale = 1;
Object.defineProperties(canvas, {
	x: {
		set: val => {
			// canvasX = clamp(val, ui.screen.offsetWidth - canvas.offsetWidth, 0);
			canvasX = val;
			canvas.style.left = canvasX + 'px';
		},
		get: () => canvasX
	},
	y: {
		set: val => {
			// canvasY = clamp(val, ui.screen.offsetHeight - canvas.offsetHeight, 0);
			canvasY = val;
			canvas.style.top = canvasY + 'px';
		},
		get: () => canvasY
	},
	scale: {
		set: val => {
			canvasScale = val;
			const lastOffsetWidth = canvas.offsetWidth;
			const lastOffsetHeight = canvas.offsetHeight;

			canvas.style.width = val * 100 + '%';
			canvas.style.height = val * 100 + '%';

			const widthDiff = canvas.offsetWidth - lastOffsetWidth;
			const heightDiff = canvas.offsetHeight - lastOffsetHeight;

			const centerXPercent = (ui.screen.offsetWidth / 2 - canvas.x) / lastOffsetWidth;
			const centerYPercent = (ui.screen.offsetHeight / 2 - canvas.y) / lastOffsetHeight;

			canvas.x -= widthDiff * centerXPercent;
			canvas.y -= heightDiff * centerYPercent;
		},
		get: () => canvasScale
	}
});
canvas.centerOnPosition = pos => {
	const widthPixelOffset = (canvas.offsetWidth - ui.screen.offsetWidth) / 2;
	const heightPixelOffset = (canvas.offsetHeight - ui.screen.offsetHeight) / 2;
	const tilesToPixels = tileSize * canvas.offsetWidth / canvasWidth;
	canvas.x = (Math.floor(tilesColumns / 2) - pos.x) * tilesToPixels - widthPixelOffset;
	canvas.y = (Math.floor(tilesRows / 2) - pos.y) * tilesToPixels - heightPixelOffset;
};

canvas.width = canvasWidth;
canvas.height = canvasHeight;
canvas.scale = 3;

const zoomCanvas = amount => {
	canvas.scale = clamp(Math.exp(-0.05 * Math.sign(amount) *
		Math.log(Math.abs(amount)) + Math.log(canvas.scale)), 1, 7);
};

window.addEventListener('wheel', e => zoomCanvas(e.deltaY));

let mouseDown = false;
let lastMousePos = {};
window.addEventListener('mousedown', e => {
	mouseDown = true;
	lastMousePos.x = e.clientX;
	lastMousePos.y = e.clientY;
});

window.addEventListener('mouseup', () => {
	mouseDown = false;
});

window.addEventListener('mousemove', e => {
	if (mouseDown) {
		canvas.x += e.clientX - lastMousePos.x;
		canvas.y += e.clientY - lastMousePos.y;
		lastMousePos.x = e.clientX;
		lastMousePos.y = e.clientY;
	}
});

const level = genCave({ seed: '1' + Math.random() });
const fog = makeFog(level.map);
const entityTracker = createEntityTracker(level.map);

const hero = createHero({
	hp: 100,
	mp: 10,
	att: 30,
	def: 30,
	speed: 30,
	acc: 30,
	eva: 30,
	crit: 0.03,
	exp: 0,
	hun: 100,
	ener: 100,
	position: { ...level.start }
});

window.addEventListener('keydown', e => {
	// const lastPos = { ...pos };
	if (e.key === 'ArrowUp') {
		hero.position.y--;
	} else if (e.key === 'ArrowRight') {
		hero.position.x++;
	} else if (e.key === 'ArrowDown') {
		hero.position.y++;
	} else if (e.key === 'ArrowLeft') {
		hero.position.x--;
	} else {
		return;
	}
	// const radius = 8;
	// const endX = lastPos.x + radius;
	// const endY = lastPos.y + radius;
	// for (let dx = lastPos.x - radius; dx < endX; dx++) {
	// 	for (let dy = lastPos.y - radius; dy < endY; dy++) {
	// 		fog.map[dx][dy] = 1;
	// 	}
	// }
	fog.reveal(hero.position.x, hero.position.y, 8);
	draw();
});

const draw = () => {
	const levelMap = level.map;
	ctx.clearRect(0, 0, canvasWidth, canvasHeight);
	const fogMap = fog.map;
	for (let x = 0; x < tilesColumns; ++x) {
		for (let y = 0; y < tilesRows; ++y) {
			if (fogMap[x][y] === 1) {
				ctx.fillStyle = '#000';
			} else {
				ctx.fillStyle = tileId2Color[levelMap[x][y]] || '#555';
			}
			ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
		}
	}

	let x = entityTracker.list.length;
	while (x-- > 0) {
		const entity = entityTracker.list[x];
		if (entity.type === 'hero') {
			ctx.fillStyle = '#00f';
			ctx.fillRect(entity.position.x * tileSize, entity.position.y * tileSize, tileSize, tileSize);
		} else if (fogMap[entity.position.x][entity.position.y] === 0) {
			ctx.fillStyle = '#f00';
			ctx.fillRect(entity.position.x * tileSize, entity.position.y * tileSize, tileSize, tileSize);
		}
	}
};

// window.draw = draw;
// window.lol = () => {
// 	console.log('pos', pos);
// 	const path = findClosestFogTilePath(map, fog.map, pos.x, pos.y);
// 	console.log(path);

// 	ctx.fillStyle = '#0f0';
// 	path.forEach(pos => {
// 		ctx.fillRect(pos.x * tileSize, pos.y * tileSize, tileSize, tileSize);
// 	});
// };

entityTracker.add(hero);

for (let t = 0; t < 20; t++) {
	while (true) {
		const x = randInt(0, tilesColumns - 1);
		const y = randInt(0, tilesRows - 1);
		if (passableTiles[level.map[x][y]] && !entityTracker.map[x][y]) {
			entityTracker.add(createMonster({ position: { x, y } }));
			break;
		}
	}
}

const engine = createSimulationEngine({ level, fog, entityTracker }, draw);
engine.timeScale = 16;

window.engine = engine;

canvas.centerOnPosition(hero.position);

engine.start();

draw();

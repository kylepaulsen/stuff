import { randArr } from './random.js';
import { passableTiles } from './caveGen/tiles.js';

export const makeMatrix = (width, height, fillVal = 0) => {
	const levelMat = [];
	for (let x = 0; x < width; ++x) {
		const col = [];
		for (let y = 0; y < height; ++y) {
			col.push(fillVal);
		}
		levelMat.push(col);
	}
	return levelMat;
};

export const manhattanDist = (x1, y1, x2, y2) => Math.abs(x1 - x2) + Math.abs(y1 - y2);

export const distSquared = (x1, y1, x2, y2) => {
	const xDiff = x1 - x2;
	const yDiff = y1 - y2;
	return xDiff * xDiff + yDiff * yDiff;
};

export const matrixRayTrace = (x1, y1, x2, y2, visit = () => {}) => {
	const xDiff = x2 - x1;
	const yDiff = y2 - y1;
	let mainToCross = Math.abs(yDiff / xDiff);
	let crossToMain = Math.abs(xDiff / yDiff);

	const direction = { x: Math.sign(xDiff), y: Math.sign(yDiff) };
	const current = { x: x1, y: y1 };
	const travel = { x: 0.5, y: 0.5 };
	let mainAxis = 'x';
	let crossAxis = 'y';

	if (mainToCross > 1) {
		// vertical-ish line
		let temp = mainToCross;
		mainToCross = crossToMain;
		crossToMain = temp;
		mainAxis = 'y';
		crossAxis = 'x';
	}

	if (visit(current.x, current.y)) {
		return true;
	}

	while (current.x !== x2 || current.y !== y2) {
		if (travel[crossAxis] < mainToCross * travel[mainAxis]) {
			travel[mainAxis] -= travel[crossAxis] * crossToMain;
			travel[crossAxis] = 1;
			current[crossAxis] += direction[crossAxis];
		} else {
			travel[crossAxis] -= travel[mainAxis] * mainToCross;
			travel[mainAxis] = 1;
			current[mainAxis] += direction[mainAxis];
		}

		if (visit(current.x, current.y)) {
			return true;
		}
	}
	return false;
};

export const safeMatrixGet = (levelMat, x, y, defaultVal) => {
	const col = levelMat[x] || [];
	const val = col[y];
	return val === undefined ? defaultVal : val;
};

export const safeMatrixSet = (levelMat, x, y, newVal) => {
	const col = levelMat[x];
	if (col !== undefined) {
		const val = col[y];
		if (val !== undefined) {
			col[y] = newVal;
		}
	}
};

export const searchMatrixInArea = (levelMat, lookingFor, cx, cy, size) => {
	const minx = cx - size;
	const maxx = cx + size;
	const miny = cy - size;
	const maxy = cy + size;
	for (let x = minx; x <= maxx; x++) {
		for (let y = miny; y <= maxy; y++) {
			if (safeMatrixGet(levelMat, x, y, undefined) === lookingFor) {
				return { x, y };
			}
		}
	}
};

export const moveDirections = [
	{x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1},
	{x: -1, y: 0}, {x: 1, y: 0},
	{x: -1, y: 1}, {x: 0, y: 1}, {x: 1, y: 1}
];
// export const moveDirections = [{x: 0, y: -1}, {x: -1, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}];

export const findClosestInMatrix = (levelMat, lookingFor, sx, sy, moveableId) => {
	const distMatrix = makeMatrix(levelMat.length, levelMat[0].length, -1);
	distMatrix[sx][sy] = 0;
	const queue = [{x: sx, y: sy, d: 0}];
	while (queue.length > 0) {
		const next = queue.shift();

		let x = moveDirections.length;
		while (x-- > 0) {
			const nextD = moveDirections[x];
			const nextX = next.x + nextD.x;
			const nextY = next.y + nextD.y;
			const nextId = safeMatrixGet(levelMat, nextX, nextY);
			if (nextId === lookingFor) {
				return { x: nextX, y: nextY };
			}
			if (nextId === moveableId && distMatrix[nextX][nextY] === -1) {
				const nextD = next.d + 1;
				distMatrix[nextX][nextY] = nextD;
				queue.push({ x: nextX, y: nextY, d: nextD });
			}
		}
	}
};

export const makePathWithDistMap = (distMap, sx, sy) => {
	const path = [{x: sx, y: sy}];

	let currentDist = Infinity;
	let currentPos = path[0];

	while (currentDist > 0) {
		let options = [];

		let bestDist = Infinity;
		let x = moveDirections.length;
		while (x-- > 0) {
			const nextD = moveDirections[x];
			const nextX = currentPos.x + nextD.x;
			const nextY = currentPos.y + nextD.y;
			const nextDist = safeMatrixGet(distMap, nextX, nextY, Infinity);
			if (nextDist > -1 && nextDist < bestDist) {
				bestDist = nextDist;
				options = [];
			}
			if (nextDist === bestDist) {
				options.push({x: nextX, y: nextY});
			}
		}

		if (options.length === 0) {
			return null;
		}

		const nextPos = randArr(options);

		currentDist = distMap[nextPos.x][nextPos.y];
		currentPos = nextPos;
		if (currentDist > 0) {
			path.push(currentPos);
		}
	}

	return path.reverse();
};

export const makePathToTarget = (map, sx, sy, ex, ey) => {
	const distMatrix = makeMatrix(map.length, map[0].length, -1);
	distMatrix[sx][sy] = 0;
	let queue = [{x: sx, y: sy, d: 0}];
	while (queue.length > 0) {
		const next = queue.shift();

		let x = moveDirections.length;
		while (x-- > 0) {
			const nextD = moveDirections[x];
			const nextX = next.x + nextD.x;
			const nextY = next.y + nextD.y;
			const nextId = safeMatrixGet(map, nextX, nextY, null);

			if (nextId !== null && passableTiles[nextId] && distMatrix[nextX][nextY] === -1) {
				const nextD = next.d + 1;
				distMatrix[nextX][nextY] = nextD;
				queue.push({ x: nextX, y: nextY, d: nextD });
				if (nextX === ex && nextY === ey) {
					queue = [];
				}
			}
		}
	}

	return makePathWithDistMap(distMatrix, ex, ey);
};

export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

export const changeAndBalanceWeightTable = (table, key, newWeight) => {
	const delta = table[key] - newWeight;
	let keys = Object.keys(table);
	let otherKeysDelta = delta / (keys.length - 1);

	table[key] = newWeight;

	keys = keys.filter(k => k !== key);

	while (otherKeysDelta !== 0 && keys.length > 0) {
		let extraDelta = 0;
		let newKeys = keys.slice();
		let x = keys.length;
		while (x-- > 0) {
			const k = keys[x];
			const val = table[k];
			if (val + otherKeysDelta < 0) {
				extraDelta += val + otherKeysDelta;
				table[k] = 0;
				newKeys = newKeys.filter(ke => ke !== k);
			} else {
				table[k] = val + otherKeysDelta;
			}
		}
		keys = newKeys;
		otherKeysDelta = extraDelta / keys.length;
	}
};

// This makes a softplus function or "hockey stick" like curve. Similar to ReLU except continuous.
// This is good for mapping a changing value to a deminishing return limit value.
export const makeSoftPlusFunc = (yInter, limitValue, approxSlope = 1) => {
	const invSlope = 1 / Math.abs(approxSlope);
	const sign = yInter < limitValue ? -1 : 1;
	const xOffset = Math.log(Math.E ** (invSlope * Math.abs(limitValue - yInter)) - 1);
	return x => (sign * Math.log(1 + Math.E ** (xOffset - x)) + (invSlope * limitValue)) / invSlope;
};

export const createWebWorkerFromFunction = func => {
	const src = '"use strict"; (' + func.toString() + ')();';
	const blob = new Blob([src], {type: 'text/javascript'});
	return new Worker(window.URL.createObjectURL(blob));
};

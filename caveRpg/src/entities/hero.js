import { randArr } from '../random.js';
import { passableTiles } from '../caveGen/tiles.js';
import { makeMatrix, safeMatrixGet, makePathWithDistMap, moveDirections } from '../util.js';

// eslint-disable-next-line max-statements
export const findClosestFogTilePath = (levelMat, fogMat, sx, sy) => {
	const distMatrix = makeMatrix(levelMat.length, levelMat[0].length, -1);
	distMatrix[sx][sy] = 0;
	const queue = [{x: sx, y: sy, d: 0}];
	const fogPositions = [];
	let minFogDist = Infinity;
	while (queue.length > 0) {
		const next = queue.shift();

		let x = moveDirections.length;
		while (x-- > 0) {
			const nextD = moveDirections[x];
			const nextX = next.x + nextD.x;
			const nextY = next.y + nextD.y;
			const nextId = safeMatrixGet(levelMat, nextX, nextY, null);

			if (nextId !== null && (passableTiles[nextId] || fogMat[nextX][nextY]) && distMatrix[nextX][nextY] === -1) {
				const nextD = next.d + 1;
				distMatrix[nextX][nextY] = nextD;
				if (fogMat[nextX][nextY]) {
					minFogDist = Math.min(minFogDist, nextD);
					fogPositions.push({x: nextX, y: nextY, d: nextD});
				} else {
					queue.push({ x: nextX, y: nextY, d: nextD });
				}
			}
		}
	}
	const closestFogPositions = [];
	let x = fogPositions.length;
	while (x-- > 0) {
		const fogPos = fogPositions[x];
		if (fogPos.d === minFogDist) {
			closestFogPositions.push(fogPos);
		}
	}

	const target = randArr(closestFogPositions);

	if (!target) {
		return [];
	}

	return makePathWithDistMap(distMatrix, target.x, target.y);
};

const createHero = options => {
	let props;
	let currentPath;
	let task = 'explore';

	const moveAlongPath = context => {
		const { entityTracker } = context;
		const nextPos = (currentPath || []).shift();
		if (nextPos && passableTiles[context.level.map[nextPos.x][nextPos.y]] &&
			!entityTracker.map[nextPos.x][nextPos.y]) {

			props.position.set(nextPos.x, nextPos.y);
			context.fog.reveal(nextPos.x, nextPos.y, 8);
		} else {
			// cant move for some reason. Bail on path.
			currentPath = null;
		}
	};

	const tasks = {
		explore: context => {
			const map = context.level.map;
			const fogMap = context.fog.map;
			if (currentPath && currentPath.length > 0) {
				const lastPos = currentPath[currentPath.length - 1];
				if (fogMap[lastPos.x][lastPos.y] === 0) {
					// we can see that the end of the path isn't passable, so abandon path.
					currentPath = null;
				}
			}
			if (!currentPath || currentPath.length === 0) {
				const { position } = props;
				currentPath = findClosestFogTilePath(map, fogMap, position.x, position.y);
			}
			moveAlongPath(context);
		}
	};

	const update = context => {
		const taskFunc = tasks[task];
		if (taskFunc) {
			taskFunc(context);
		}
	};

	const init = context => {
		const { position } = props;
		context.fog.reveal(position.x, position.y, 8);
	};

	props = {
		type: 'hero',
		update,
		init,
		...options
	};

	return props;
};

export default createHero;

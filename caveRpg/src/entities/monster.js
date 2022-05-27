import { randArr } from '../random.js';
import { passableTiles } from '../caveGen/tiles.js';
import { makeMatrix, safeMatrixGet, makePathToTarget, moveDirections } from '../util.js';

const createPossibleWanderList = (map, sx, sy, wanderRadius) => {
	const possibles = [{ x: sx, y: sy }];
	const distMatrix = makeMatrix(map.length, map[0].length, -1);
	distMatrix[sx][sy] = 0;
	let queue = [{x: sx, y: sy, d: 0}];
	while (queue.length > 0) {
		const next = queue.shift();

		let x = moveDirections.length;
		while (x-- > 0) {
			const nextDir = moveDirections[x];
			const nextX = next.x + nextDir.x;
			const nextY = next.y + nextDir.y;
			const nextId = safeMatrixGet(map, nextX, nextY, null);

			if (nextId !== null && passableTiles[nextId] && distMatrix[nextX][nextY] === -1) {
				const nextD = next.d + 1;
				distMatrix[nextX][nextY] = nextD;
				if (nextD < wanderRadius) {
					queue.push({ x: nextX, y: nextY, d: nextD });
					possibles.push({ x: nextX, y: nextY });
				}
			}
		}
	}
	return possibles;
};

const createMonster = options => {
	let props;
	let currentPath;
	let task = 'wander';

	const wanderRadius = options.wanderRadius || 5;
	const wanderRate = options.wanderRate || 0.2;
	let possibleWanderList;
	const startPosition = { ...options.position };

	const moveAlongPath = context => {
		const { entityTracker } = context;
		const nextPos = (currentPath || []).shift();
		if (nextPos && passableTiles[context.level.map[nextPos.x][nextPos.y]] &&
			!entityTracker.map[nextPos.x][nextPos.y]) {

			props.position.set(nextPos.x, nextPos.y);
		} else {
			// cant move for some reason. Bail on path.
			currentPath = null;
		}
	};

	const createWanderPath = context => {
		const map = context.level.map;
		if (!possibleWanderList) {
			possibleWanderList = createPossibleWanderList(map, startPosition.x, startPosition.y, wanderRadius);
		}
		const target = randArr(possibleWanderList);
		currentPath = makePathToTarget(map, props.position.x, props.position.y, target.x, target.y);
	};

	const tasks = {
		wander: context => {
			if (!currentPath && Math.random() < wanderRate) {
				createWanderPath(context);
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

	props = {
		type: 'monster',
		speed: 30,
		update,
		...options
	};

	return props;
};

export default createMonster;

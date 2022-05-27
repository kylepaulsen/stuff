import createSeededRNG from '../random.js';
import { tiles } from './tiles.js';
import { makeMatrix, changeAndBalanceWeightTable, manhattanDist, safeMatrixGet } from '../util.js';

// eslint-disable-next-line max-statements, complexity
const gen = opts => {
	const rng = createSeededRNG(opts.seed || Math.random());
	const randInt = rng.randInt;
	const tilesColumns = opts.cols || 100;
	const tilesRows = opts.rows || 75;
	const coverage = opts.coverage || 0.3;
	const map = makeMatrix(tilesColumns, tilesRows);

	const numFloorsToGet = Math.floor(tilesColumns * tilesRows * coverage);

	// The distance from the map sides that starts to change the direction chances.
	const sideRepulsionDist = 10;

	const start = {
		x: randInt(1, tilesColumns - 1),
		y: randInt(1, tilesRows - 1)
	};

	const end = {x: 0, y: 0};

	const currentTile = { ...start };

	map[currentTile.x][currentTile.y] = tiles.ground;

	let numFloors = 1;
	let previousDirection;
	let furthestDistFromStart = 0;

	const move = function(moveChances) {
		const moveDirection = rng.randWeightedEvent(moveChances);
		if (moveDirection === 'up') {
			currentTile.y--;
		} else if (moveDirection === 'down') {
			currentTile.y++;
		} else if (moveDirection === 'right') {
			currentTile.x++;
		} else {
			currentTile.x--;
		}
		previousDirection = moveDirection;

		// we need this for corner cases (literally)
		currentTile.x = Math.max(Math.min(currentTile.x, tilesColumns - 1), 0);
		currentTile.y = Math.max(Math.min(currentTile.y, tilesRows - 1), 0);
	};

	let lockDirection;
	let lockDirectionLeft = 0;
	const moveDirections = ['up', 'left', 'down', 'right'];

	while (numFloors < numFloorsToGet) {
		const moveChances = {
			up: 0.25,
			right: 0.25,
			down: 0.25,
			left: 0.25
		};

		// if you just moved up, you can't move down etc...
		if (previousDirection === 'up') {
			changeAndBalanceWeightTable(moveChances, 'down', 0);
		} else if (previousDirection === 'right') {
			changeAndBalanceWeightTable(moveChances, 'left', 0);
		} else if (previousDirection === 'down') {
			changeAndBalanceWeightTable(moveChances, 'up', 0);
		} else if (previousDirection === 'left') {
			changeAndBalanceWeightTable(moveChances, 'right', 0);
		}

		if (lockDirectionLeft > 0) {
			lockDirectionLeft--;
			changeAndBalanceWeightTable(moveChances, lockDirection, 0);
		} else if (rng.random() < 0.005) {
			// special event where a direction is disabled for a random number of times.
			lockDirectionLeft = randInt(30, 200);
			lockDirection = rng.randArr(moveDirections);
		}

		// discurage moving towards edges.
		if (currentTile.x < sideRepulsionDist) {
			const factor = 1 - (sideRepulsionDist - currentTile.x) / sideRepulsionDist;
			const newChance = moveChances.left * factor;
			const chanceDiff = moveChances.left - newChance;
			moveChances.right += chanceDiff * 0.6;
			moveChances.up += chanceDiff * 0.2;
			moveChances.down += chanceDiff * 0.2;
			moveChances.left = newChance;
			lockDirectionLeft = 0;
		} else if (currentTile.x > (tilesColumns - sideRepulsionDist - 1)) {
			const factor = (tilesColumns - currentTile.x - 1) / sideRepulsionDist;
			const newChance = moveChances.right * factor;
			const chanceDiff = moveChances.right - newChance;
			moveChances.left += chanceDiff * 0.6;
			moveChances.up += chanceDiff * 0.2;
			moveChances.down += chanceDiff * 0.2;
			moveChances.right = newChance;
			lockDirectionLeft = 0;
		}
		if (currentTile.y < sideRepulsionDist) {
			const factor = 1 - (sideRepulsionDist - currentTile.y) / sideRepulsionDist;
			const newChance = moveChances.up * factor;
			const chanceDiff = moveChances.up - newChance;
			moveChances.right += chanceDiff * 0.2;
			moveChances.down += chanceDiff * 0.6;
			moveChances.left += chanceDiff * 0.2;
			moveChances.up = newChance;
			lockDirectionLeft = 0;
		} else if (currentTile.y > (tilesRows - sideRepulsionDist - 1)) {
			const factor = (tilesRows - currentTile.y - 1) / sideRepulsionDist;
			const newChance = moveChances.down * factor;
			const chanceDiff = moveChances.down - newChance;
			moveChances.left += chanceDiff * 0.2;
			moveChances.up += chanceDiff * 0.6;
			moveChances.right += chanceDiff * 0.2;
			moveChances.down = newChance;
			lockDirectionLeft = 0;
		}

		move(moveChances);

		// place a floor!
		if (map[currentTile.x][currentTile.y] !== tiles.ground) {
			map[currentTile.x][currentTile.y] = tiles.ground;
			numFloors++;

			const distFromStart = manhattanDist(start.x, start.y, currentTile.x, currentTile.y);

			if (distFromStart > furthestDistFromStart) {
				end.x = currentTile.x;
				end.y = currentTile.y;
				furthestDistFromStart = distFromStart;
			}
		}
	}

	// ================= POST PROCESS ===================

	// stand and end can't be along edge.
	if (start.x === 0) {
		start.x = 1;
	} else if (start.x === tilesColumns - 1) {
		start.x = tilesColumns - 2;
	}
	if (start.y === 0) {
		start.y = 1;
	} else if (start.y === tilesRows - 1) {
		start.y = tilesRows - 2;
	}
	if (end.x === 0) {
		end.x = 1;
	} else if (end.x === tilesColumns - 1) {
		end.x = tilesColumns - 2;
	}
	if (end.y === 0) {
		end.y = 1;
	} else if (end.y === tilesRows - 1) {
		end.y = tilesRows - 2;
	}

	// pad start and end with surrounding floors.
	for (let x = -1; x < 2; x++) {
		for (let y = -1; y < 2; y++) {
			map[start.x + x][start.y + y] = tiles.ground;
			map[end.x + x][end.y + y] = tiles.ground;
		}
	}

	for (let workIters = 0; workIters < 2; workIters++) {
		// remove walls that don't touch at least 2 other walls (cleans up noise).
		let recheck = true;
		while (recheck) {
			recheck = false;
			for (let x = 0; x < tilesColumns; x++) {
				for (let y = 0; y < tilesRows; y++) {
					let numWalls = -1;
					for (let dx = -1; dx < 2; dx++) {
						for (let dy = -1; dy < 2; dy++) {
							if (safeMatrixGet(map, x + dx, y + dy, tiles.wall) === tiles.wall) {
								numWalls++;
							}
						}
					}

					if (map[x][y] === tiles.wall && numWalls < 2) {
						map[x][y] = tiles.ground;
						recheck = true;
					}
				}
			}
		}

		// remove checkerboards
		recheck = true;
		while (recheck) {
			recheck = false;
			for (let x = 0; x < tilesColumns - 1; x++) {
				for (let y = 0; y < tilesRows - 1; y++) {
					if (map[x][y] === tiles.wall && map[x + 1][y] === tiles.ground &&
						map[x + 1][y + 1] === tiles.wall && map[x][y + 1] === tiles.ground) {

						map[x][y] = tiles.ground;
						recheck = true;
					} else if (map[x][y] === tiles.ground && map[x + 1][y] === tiles.wall &&
						map[x + 1][y + 1] === tiles.ground && map[x][y + 1] === tiles.wall) {

						map[x + 1][y] = tiles.ground;
						recheck = true;
					}
				}
			}
		}
	}

	// place start and end.
	map[start.x][start.y] = tiles.stairsUp;
	map[end.x][end.y] = tiles.stairsDown;

	return {
		map,
		start,
		end,
		rng
	};
};

export default gen;

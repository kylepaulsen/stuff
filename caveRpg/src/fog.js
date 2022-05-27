import { makeMatrix, safeMatrixGet, safeMatrixSet, distSquared, matrixRayTrace } from './util.js';
import { tiles, passableTiles } from './caveGen/tiles.js';

const DARK_FOG = 1;

const makeFog = map => {
	const width = map.length;
	const height = map[0].length;
	const fogMap = makeMatrix(width, height, DARK_FOG);

	const reveal = (x, y, radius) => {
		const radiusSquared = radius * radius;
		const endX = x + radius;
		const endY = y + radius;
		for (let dx = x - radius; dx < endX; dx++) {
			for (let dy = y - radius; dy < endY; dy++) {
				if (distSquared(x, y, dx, dy) < radiusSquared) {
					let hitWall = false;
					let lastNonWallX = 0;
					let lastNonWallY = 0;
					matrixRayTrace(x, y, dx, dy, (zx, zy) => {
						const nextTile = safeMatrixGet(map, zx, zy, tiles.wall);

						// normal check ============
						// safeMatrixSet(fogMap, zx, zy, 0);
						// return !passableTiles[nextTile];

						// corner wall bleed check ==========
						if (!hitWall || (!passableTiles[nextTile] && lastNonWallX !== zx && lastNonWallY !== zy)) {
							safeMatrixSet(fogMap, zx, zy, 0);
						}
						if (!passableTiles[nextTile]) {
							if (hitWall) {
								return true;
							}
							hitWall = true;
							return false;
						}
						lastNonWallX = zx;
						lastNonWallY = zy;
						return hitWall;
					});
				}
			}
		}
	};

	return {
		map: fogMap,
		reveal
	};
};

export default makeFog;

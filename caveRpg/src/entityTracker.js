import { makeMatrix } from './util.js';

const createEntityTracker = map => {
	const width = map.length;
	const height = map[0].length;
	const entityMap = makeMatrix(width, height, null);

	const api = {};
	api.map = entityMap;
	api.list = [];

	api.add = entity => {
		entity.alive = true;
		if (entity.position) {
			const position = { ...entity.position };
			if (!entityMap[position.x][position.y]) {
				const proxyPosition = {
					set(x, y) {
						if (!entityMap[x][y]) {
							entityMap[position.x][position.y] = null;
							entityMap[x][y] = entity;
							position.x = x;
							position.y = y;
						}
					}
				};
				Object.defineProperties(proxyPosition, {
					x: { get() {
						return position.x;
					} },
					y: { get() {
						return position.y;
					} }
				});
				entity.position = proxyPosition;
				entityMap[position.x][position.y] = entity;
			} else {
				console.error('Entities not allowed in same location.', entity, entityMap[position.x][position.y]);
				return;
			}
		}
		api.list.push(entity);
	};

	api.remove = entityToRemove => {
		const newEntityList = [];
		let x = api.list.length;
		while (x-- > 0) {
			const entity = api.list[x];
			if (entity !== entityToRemove) {
				newEntityList.push(entity);
			}
		}
		api.list = newEntityList;
		if (entityToRemove.position &&
			entityMap[entityToRemove.position.x][entityToRemove.position.y] === entityToRemove) {

			entityMap[entityToRemove.position.x][entityToRemove.position.y] = null;
		}
	};

	return api;
};

export default createEntityTracker;

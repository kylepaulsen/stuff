import { makeSoftPlusFunc, createWebWorkerFromFunction } from './util.js';

const speedToTimeoutSP = makeSoftPlusFunc(2, 0.5, 0.3);
const speedToTimeout = x => Math.ceil(speedToTimeoutSP(x / 100) * 1000);

const createTimeoutWorker = () => createWebWorkerFromFunction(() => {
	const actions = {
		requestTimeout(data) {
			setTimeout(() => {
				postMessage(data.message);
			}, data.timeout);
		}
	};

	self.addEventListener('message', e => {
		const data = e.data;
		const action = actions[data.action];
		if (action) {
			action(data);
		}
	});
});

export const globalTimeoutWorker = createTimeoutWorker();

// An entity must look something like:
// It can have either speed or timeout.
// {
// 	speed: {Int},
// 	timeout: {Int},
// 	update: {Function}
// }

const createSimulationEngine = (context, onSimulate = () => {}) => {
	const engineId = 'ID' + Math.random();
	const { entityTracker } = context;
	let lastSimulationTime = 0;
	let api;

	const timeoutWorker = globalTimeoutWorker;

	const findSmallestTimeoutLeft = () => {
		const entities = entityTracker.list;
		let smallestTimeoutLeft = Infinity;

		let x = entities.length;
		while (x-- > 0) {
			const entity = entities[x];
			if (entity.timeoutLeft < smallestTimeoutLeft) {
				smallestTimeoutLeft = entity.timeoutLeft;
			}
		}
		return smallestTimeoutLeft;
	};

	const updateTimeoutLeft = deltaTime => {
		const entities = entityTracker.list;
		let x = entities.length;
		while (x-- > 0) {
			const entity = entities[x];
			entity.timeoutLeft -= deltaTime;
		}
	};

	const findEntitiesReadyToUpdate = () => {
		const entities = entityTracker.list;
		const ready = [];
		let x = entities.length;
		while (x-- > 0) {
			const entity = entities[x];
			if (entity.timeoutLeft < 0 && entity.alive) {
				ready.push(entity);
			}
		}
		return ready.sort((a, b) => a.timeoutLeft - b.timeoutLeft);
	};

	const removeTheDead = () => {
		const entities = entityTracker.list;
		let x = entities.length;
		while (x-- > 0) {
			const entity = entities[x];
			if (!entity.alive) {
				entityTracker.remove(entity);
			}
		}
	};

	const simulate = () => {
		const now = Date.now();
		const deltaTime = now - lastSimulationTime;

		updateTimeoutLeft(deltaTime);
		let readyToUpdate = findEntitiesReadyToUpdate();

		if (readyToUpdate.length > 0) {
			while (readyToUpdate.length > 0) {
				for (let x = 0, len = readyToUpdate.length; x < len; x++) {
					const entity = readyToUpdate[x];
					entity.update(context, entityTracker, api);
					entity.timeoutLeft += (entity.timeout || speedToTimeout(entity.speed)) / api.timeScale;
				}

				readyToUpdate = findEntitiesReadyToUpdate();
			}

			removeTheDead();
		}

		timeoutWorker.postMessage({
			action: 'requestTimeout',
			message: engineId,
			timeout: findSmallestTimeoutLeft()
		});

		lastSimulationTime = now;

		onSimulate(entityTracker, deltaTime);
	};

	const onWebworkerMessage = e => {
		if (e.data === engineId) {
			simulate();
		}
	};

	const start = () => {
		const entities = entityTracker.list;
		lastSimulationTime = Date.now();

		let x = entities.length;
		while (x-- > 0) {
			const entity = entities[x];

			if ((!entity.speed && !entity.timeout) || !entity.update) {
				throw new Error('All entities must have a speed or a timeout and a update function.');
			}
			if (!entity.timeoutLeft) {
				entity.timeoutLeft = (entity.timeout || speedToTimeout(entity.speed)) / api.timeScale;
			}

			if (entity.init) {
				entity.init(context, entityTracker, api);
			}
		}

		timeoutWorker.postMessage({
			action: 'requestTimeout',
			message: engineId,
			timeout: findSmallestTimeoutLeft()
		});
		timeoutWorker.addEventListener('message', onWebworkerMessage);
	};

	const stop = () => {
		timeoutWorker.removeEventListener('message', onWebworkerMessage);
	};

	api = {
		start,
		stop,
		timeScale: 1
	};

	return api;
};

export default createSimulationEngine;

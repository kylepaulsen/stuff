const createRandomHelpers = rngFunc => ({
	// randInt is [low, high]
	randInt: (low, high) => Math.floor(rngFunc() * (high - low + 1)) + low,
	randArr: arr => arr[Math.floor(rngFunc() * arr.length)],
	randWeightedEvent: eventWeights => {
		const roll = rngFunc();
		const keys = Object.keys(eventWeights);
		let x = keys.length;
		let total = 0;
		while (x-- > 0) {
			const key = keys[x];
			total += eventWeights[key];
			if (roll < total) {
				return key;
			}
		}
		return keys[0];
	}
});

const createSeededRNG = (seed, rngState = true) => {
	// eslint-disable-next-line new-cap
	const rng = new Math.seedrandom(seed, { state: rngState });
	const rngFuncs = createRandomHelpers(rng);

	return {
		random: rng,
		get state() {
			return rng.state();
		},
		...rngFuncs
	};
};

export const { randInt, randArr, randWeightedEvent } = createRandomHelpers(Math.random);

export default createSeededRNG;

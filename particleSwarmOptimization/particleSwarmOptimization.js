function particleSwarmOptimization(options) {
    const defaultOptions = {
        particles: 20,
        particleSize: 2, // dimention of problem to solve
        costFunction: undefined, // function to minimize (required)
        initializeParticle: undefined, // function to create particle position (required)
        followLeaderChance: 1, // odds of any particle being considered as a leader.
                                // Value < 1 is helpful for preventing getting "stuck" at a local minimum.
        getSpreadFunction: undefined // a function to examine the "spread" of the particles. A low spread is close to 0.
    };
    const defaultVelocityDecay = 0.8;
    const defaultPersonalGravity = 0.4;
    const defaultGlobalGravity = 0.4;
    options = Object.assign({}, defaultOptions, options);
    const costFunction = options.costFunction;
    const initializeParticle = options.initializeParticle;
    if (!costFunction || !initializeParticle) {
        throw new Error('Must supply costFunction and initializeParticle functions.');
    }
    const numParticles = options.particles;
    const particleSize = options.particleSize;
    const getSpreadFunction = options.getSpreadFunction;
    const defaultVelocityDecayVector = (new Array(numParticles)).fill(defaultVelocityDecay);
    const followLeaderChance = options.followLeaderChance;

    let globalBestCost;
    let globalBestPosition;
    let particles;

    globalBestCost = Infinity;
    const resetParticles = function(initializeParticleFunction = initializeParticle) {
        particles = [];
        // initialize particles...
        for (let x = 0; x < numParticles; x++) {
            const particlePos = initializeParticleFunction(x, numParticles);
            if (particlePos.length !== particleSize) {
                throw new Error(`initializeParticle function must return array with same size as particleSize (${particleSize})`);
            }
            const newParticle = {
                position: particlePos,
                velocity: (new Array(particleSize)).fill(0),
                bestCost: Infinity,
                bestPosition: (new Array(particleSize)).fill(0),
                leaderPosition: undefined
            };
            particles.push(newParticle);
            const cost = costFunction(newParticle.position);
            newParticle.bestCost = cost;
            if (cost < globalBestCost) {
                globalBestCost = cost;
                globalBestPosition = newParticle.position.slice();
            }
        }
    };
    resetParticles();

    const averagePosition = (new Array(particleSize)).fill(0);

    const step = function(options = {}) {
        let personalGravity = options.personalGravity;
        let globalGravity = options.globalGravity;
        let velocityDecay = options.velocityDecay;
        if (!personalGravity) {
            personalGravity = defaultPersonalGravity;
        }
        if (!globalGravity) {
            globalGravity = defaultGlobalGravity;
        }
        if (!velocityDecay) {
            velocityDecay = defaultVelocityDecayVector;
        }
        for (let p = 0; p < numParticles; p++) {
            const particle = particles[p];
            const pBestPosition = particle.bestPosition;
            const position = particle.position;
            const velocity = particle.velocity;

            // particles can choose to follow their own "leader".
            const leaderPosition = particle.leaderPosition || globalBestPosition;

            if (getSpreadFunction) {
                averagePosition.fill(0);
            }

            // update position and velocity...
            for (let x = 0; x < particleSize; x++) {
                const pBestDiff = pBestPosition[x] - position[x];
                const gBestDiff = leaderPosition[x] - position[x];
                let vel = velocityDecay[x] * velocity[x] +
                    personalGravity * Math.random() * pBestDiff +
                    globalGravity * Math.random() * gBestDiff;

                velocity[x] = vel;
                position[x] += vel;
                if (getSpreadFunction) {
                    averagePosition[x] += position[x];
                }
            }

            // evaluate cost...
            const cost = costFunction(position);
            if (cost < particle.bestCost) {
                particle.bestCost = cost;
                const positionCopy = position.slice();
                particle.bestPosition = positionCopy;

                if (cost < globalBestCost && followLeaderChance >= 1) {
                    globalBestCost = cost;
                    globalBestPosition = positionCopy;
                }
            }
        }

        if (getSpreadFunction) {
            for (let x = 0; x < particleSize; x++) {
                averagePosition[x] = averagePosition[x] / numParticles;
            }
            let totalDist = 0;
            for (let p = 0; p < numParticles; p++) {
                let dist = 0;
                const position = particles[p].position;
                for (let x = 0; x < particleSize; x++) {
                    const diff = position[x] - averagePosition[x];
                    dist += diff * diff;
                }
                totalDist += dist;
            }
            getSpreadFunction(totalDist / numParticles);
        }

        if (followLeaderChance < 1) {
            // Go through each particle and choose a leader to follow.
            // The leader chance makes it possible to NOT follow the global best leader.
            for (let p1 = 0; p1 < numParticles; p1++) {
                const updatingParticle = particles[p1];

                let leaderParticle = particles[Math.floor(Math.random() * particles.length)];
                let bestCostSoFar = leaderParticle.bestCost;
                for (let p2 = 0; p2 < numParticles; p2++) {
                    const particle = particles[p2];
                    const cost = particle.bestCost;
                    if (cost < bestCostSoFar && p1 !== p2 && Math.random() < followLeaderChance) {
                        leaderParticle = particle;
                        bestCostSoFar = cost;
                    }
                }

                if (updatingParticle.bestCost < globalBestCost) {
                    globalBestCost = updatingParticle.bestCost;
                    globalBestPosition = updatingParticle.bestPosition.slice();
                }

                updatingParticle.leaderPosition = leaderParticle.bestPosition;
            }
        }

        return {
            bestCost: globalBestCost,
            bestPosition: globalBestPosition
        };
    };

    const results = function() {
        return {
            bestCost: globalBestCost,
            bestPosition: globalBestPosition
        };
    };

    const getParticles = () => particles;

    return {
        step,
        resetParticles,
        results,
        getParticles
    };
}

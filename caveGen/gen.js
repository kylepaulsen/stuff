/* globals app, util */
(function() {
    'use strict';

    const tileIds = {
        wall: 0,
        floor: 1,
        start: 2,
        end: 3,
        treasure: 4
    };
    app.tileIds = tileIds;

    function gen(opts) {
        const randomGenerator = app.randomGenerator;
        const randInt = util.randInt;
        const tilesColumns = opts.cols;
        const tilesRows = opts.rows;
        const coverage = opts.coverage || 0.3;
        const tiles = util.makeMatrix(tilesColumns, tilesRows);

        const numFloorsToGet = Math.floor(tilesColumns * tilesRows * coverage);
        // The distance from the map sides that starts to change the direction chances.
        const sideRepulsionDist = 10;

        // start around the edges somewhere.
        const start = {
            x: randInt(1, sideRepulsionDist),
            y: randInt(1, sideRepulsionDist)
        };
        if (app.randomGenerator.random() > 0.5) {
            start.x = tilesColumns - start.x - 1;
        }
        if (app.randomGenerator.random() > 0.5) {
            start.y = tilesRows - start.y - 1;
        }

        const end = {x: 0, y: 0};

        const currentTile = {
            x: start.x,
            y: start.y
        };

        tiles[currentTile.x][currentTile.y] = tileIds.floor;

        let numFloors = 1;
        let previousDirection;
        let furthestDistFromStart = 0;

        const move = function(moveChances) {
            const directions = Object.keys(moveChances);
            const rand = randomGenerator.random();
            let x = directions.length;
            let totalChance = 0;
            let moveDirection;
            while (x--) {
                const moveChance = moveChances[directions[x]];
                if (rand < moveChance + totalChance) {
                    moveDirection = directions[x];
                    break;
                }
                totalChance += moveChance;
            }
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

        const zeroOutMoveChance = function(chanceObj, key) {
            const distribute = chanceObj[key] * (1 / 3);
            for (let k in chanceObj) {
                if (k !== key) {
                    chanceObj[k] += distribute;
                }
            }
            chanceObj[key] = 0;
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
                zeroOutMoveChance(moveChances, 'down');
            } else if (previousDirection === 'right') {
                zeroOutMoveChance(moveChances, 'left');
            } else if (previousDirection === 'down') {
                zeroOutMoveChance(moveChances, 'up');
            } else if (previousDirection === 'left') {
                zeroOutMoveChance(moveChances, 'right');
            }

            if (lockDirectionLeft > 0) {
                lockDirectionLeft--;
                zeroOutMoveChance(moveChances, lockDirection);
            } else {
                if (randomGenerator.random() < 0.005) {
                    lockDirectionLeft = randInt(30, 200);
                    lockDirection = moveDirections[randInt(0, moveDirections.length - 1)];
                }
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
            if (tiles[currentTile.x][currentTile.y] !== tileIds.floor) {
                tiles[currentTile.x][currentTile.y] = tileIds.floor;
                numFloors++;

                const distFromStart = util.taxicabDist(start.x, start.y, currentTile.x, currentTile.y);

                if (distFromStart > furthestDistFromStart) {
                    end.x = currentTile.x;
                    end.y = currentTile.y;
                    furthestDistFromStart = distFromStart;
                }
            }
        }

        // dont allow start or end to be along an edge.
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
                tiles[start.x + x][start.y + y] = tileIds.floor;
                tiles[end.x + x][end.y + y] = tileIds.floor;
            }
        }

        /*
        // This code really cleans the cave up.
        const countWalls = function(x, y) {
            if (x < 0 || x > tilesColumns - 1) {
                return 1;
            }
            if (y < 0 || y > tilesRows - 1) {
                return 1;
            }
            return tiles[x][y] === tileIds.wall;
        };

        const countNeighbors = function(x, y) {
            let count = 0;
            for (let dx = -1; dx < 2; dx++) {
                for (let dy = -1; dy < 2; dy++) {
                    if (dx !== 0 || dy !== 0) {
                        count += countWalls(x + dx, y + dy);
                    }
                }
            }
            return count;
        };

        for (let x = 0; x < tilesColumns; x++) {
            for (let y = 0; y < tilesRows; y++) {
                if (tiles[x][y] === tileIds.wall && countNeighbors(x, y) < 2) {
                    tiles[x][y] = tileIds.floor;
                    x--;
                    y--;
                }
            }
        }
        */

        // try to remove checkerboard patterns.
        let reCheck = true;
        for (let t = 0; t < 3 && reCheck; t++) {
            reCheck = false;
            for (let x = 0; x < tilesColumns - 1; x++) {
                for (let y = 0; y < tilesRows - 1; y++) {
                    if (tiles[x][y] === tileIds.floor && tiles[x + 1][y] === tileIds.wall &&
                        tiles[x][y + 1] === tileIds.wall && tiles[x + 1][y + 1] === tileIds.floor) {

                        tiles[x][y + 1] = tileIds.floor;
                        tiles[x + 1][y] = tileIds.floor;
                        reCheck = true;
                    } else if (tiles[x][y] === tileIds.wall && tiles[x + 1][y] === tileIds.floor &&
                        tiles[x][y + 1] === tileIds.floor && tiles[x + 1][y + 1] === tileIds.wall) {

                        tiles[x][y] = tileIds.floor;
                        tiles[x + 1][y + 1] = tileIds.floor;
                        reCheck = true;
                    }
                }
            }
        }

        // place start and end.
        tiles[start.x][start.y] = tileIds.start;
        tiles[end.x][end.y] = tileIds.end;

        app.placeTreasures({
            tiles: tiles,
            count: randInt(opts.minTreasures, opts.maxTreasures),
            start: start,
            end: end,
            tileIds: tileIds
        });

        tiles.start = start;
        tiles.end = end;

        return tiles;
    }

    app.gen = gen;
})();

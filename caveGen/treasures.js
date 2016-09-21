/* globals app, util */
(function() {
    'use strict';

    function placeTreasures(opts) {
        const tiles = opts.tiles;
        const start = opts.start;
        const end = opts.end;
        const tileIds = opts.tileIds;
        let num = opts.count;

        const tilesColumns = tiles.length;
        const tilesRows = tiles[0].length;

        const distGridObj = app.makeDistanceGrid(tiles, start.x, start.y);
        const distGrid = distGridObj.grid;
        app.startDistGridObj = distGridObj;

        // always place a treasure at the max distance point.
        if (tiles[distGridObj.maxDistCoord.x][distGridObj.maxDistCoord.y] === tileIds.floor) {
            tiles[distGridObj.maxDistCoord.x][distGridObj.maxDistCoord.y] = tileIds.treasure;
            num--;
        }

        // no treasures near the start!
        const startNoWanderSize = 10;
        for (let x = start.x - startNoWanderSize; x < start.x + startNoWanderSize; x++) {
            for (let y = start.y - startNoWanderSize; y < start.y + startNoWanderSize; y++) {
                const val = util.safeMatrixGet(distGrid, x, y, -1);
                if (val !== -1) {
                    distGrid[x][y] = -1;
                }
            }
        }

        const wanderTreasure = function(treasureCoord) {
            let numGoodMoves = 1;
            const lookForMovesSize = util.randInt(2, 6);
            while (numGoodMoves) {
                const currentScore = distGrid[treasureCoord.x][treasureCoord.y];
                const moves = [];
                const minX = treasureCoord.x - lookForMovesSize;
                const minY = treasureCoord.y - lookForMovesSize;
                const maxX = treasureCoord.x + lookForMovesSize;
                const maxY = treasureCoord.y + lookForMovesSize;
                for (let x = minX; x <= maxX; x++) {
                    for (let y = minY; y <= maxY; y++) {
                        if (treasureCoord.x !== x || treasureCoord.y !== y) {
                            moves.push({x: x, y: y});
                        }
                    }
                }
                let goodMoves = [];
                let t = moves.length;
                while (t--) {
                    const move = moves[t];
                    const score = util.safeMatrixGet(distGrid, move.x, move.y, -1);
                    if (score > currentScore) {
                        move.score = score;
                        goodMoves.push(move);
                    }
                }
                numGoodMoves = goodMoves.length;
                if (numGoodMoves) {
                    goodMoves.sort(function(a, b) {
                        return b.score - a.score;
                    });
                    const maxScore = goodMoves[0].score;
                    let cutoff = 1;
                    for (let x = 0; x < numGoodMoves; x++) {
                        if (goodMoves[x].score < maxScore) {
                            cutoff = x;
                            break;
                        }
                    }
                    goodMoves = goodMoves.slice(0, cutoff);
                    numGoodMoves = goodMoves.length;
                    treasureCoord = goodMoves[util.randInt(0, numGoodMoves - 1)];
                }
            }
            return treasureCoord;
        };

        // dividing map into quads.
        const quadOffset = {
            x: Math.floor(tilesColumns / 2),
            y: Math.floor(tilesRows / 2)
        };

        let quad = 0;
        let mainTries = num * 20;
        while (num && mainTries--) {
            // choose a quad to randomly pick a point in.
            const randStart = {
                x: 0,
                y: 0
            };
            const randEnd = {
                x: quadOffset.x - 1,
                y: quadOffset.y - 1
            };
            if (quad === 1 || quad === 3) {
                randStart.x = quadOffset.x;
                randEnd.x = tilesColumns - 1;
            }
            if (quad === 2 || quad === 3) {
                randStart.y = quadOffset.y;
                randEnd.y = tilesRows - 1;
            }
            // where the treasure will spawn before we make it "travel".
            let treasureCoord = {
                x: util.randInt(randStart.x, randEnd.x),
                y: util.randInt(randStart.y, randEnd.y)
            };

            let tries = 20;
            while ((tiles[treasureCoord.x][treasureCoord.y] !== tileIds.floor ||
                distGrid[treasureCoord.x][treasureCoord.y] === -1) && tries--) {

                // not valid if not on a floor with a positive distance... so try again.
                treasureCoord.x = util.randInt(randStart.x, randEnd.x);
                treasureCoord.y = util.randInt(randStart.y, randEnd.y);
            }
            if (tiles[treasureCoord.x][treasureCoord.y] === tileIds.floor) {
                // make that treasure wander to a good spot!
                treasureCoord = wanderTreasure(treasureCoord);
                if (tiles[treasureCoord.x][treasureCoord.y] !== tileIds.treasure) {
                    // oh good, we have not placed treasure here yet.
                    let foundEndNearby = util.searchMatrixInArea(tiles, tileIds.end,
                        treasureCoord.x, treasureCoord.y, 4);
                    if (foundEndNearby && app.randomGenerator.random() < 0.1) {
                        // if lucky, let it slide this time...
                        foundEndNearby = false;
                    }
                    let foundTreasureNearby = util.searchMatrixInArea(tiles, tileIds.treasure,
                        treasureCoord.x, treasureCoord.y, 6);
                    if (foundTreasureNearby && app.randomGenerator.random() < 0.1) {
                        // if lucky, let it slide this time...
                        foundTreasureNearby = false;
                    }
                    // dont allow spawning next to end or other treasure (unless lucky).
                    if (!foundTreasureNearby && !foundEndNearby) {
                        tiles[treasureCoord.x][treasureCoord.y] = tileIds.treasure;
                        num--;
                    }
                }
            }

            // change to the next quad.
            quad = (quad + 1) % 4;
        }

        // reduce the chances a treasure will spawn next to the end (it is quite common without this).
        let foundTreasureNearEnd = util.searchMatrixInArea(tiles, tileIds.treasure, end.x, end.y, 3);
        if (foundTreasureNearEnd && app.randomGenerator.random() < 0.6) {
            tiles[foundTreasureNearEnd.x][foundTreasureNearEnd.y] = tileIds.floor;
        }
    }

    app.placeTreasures = placeTreasures;
})();

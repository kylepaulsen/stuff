/* globals app, queue, util */
(function() {
    'use strict';

    // This function assumes that you have a grid (2d array).
    function makeDistanceGrid(grid, startx, starty) {
        const toVisit = queue();
        const touchedQueue = {};
        const numCols = grid.length;
        const numRows = grid[0].length;
        const distanceGrid = util.makeMatrix(numCols, numRows, -1);

        let maxDist = 0;
        const maxDistCoord = {x: 0, y: 0};

        const isWall = function(x, y) {
            if (x < 0 || x > numCols - 1 || y < 0 || y > numRows - 1) {
                return true;
            }
            return grid[x][y] === 0;
        };

        const addNeighborsToQueueAndGetNextDist = function(x, y) {
            const ds = [Infinity, Infinity, Infinity, Infinity];
            const coords = [
                {x: x, y: y - 1},
                {x: x + 1, y: y},
                {x: x, y: y + 1},
                {x: x - 1, y: y}
            ];

            let t = 4;
            while (t--) {
                const coord = coords[t];
                const hash = coord.x + ',' + coord.y;
                if (!isWall(coord.x, coord.y)) {
                    ds[t] = distanceGrid[coord.x][coord.y];
                    if (ds[t] === -1) {
                        if (!touchedQueue[hash]) {
                            toVisit.push({x: coord.x, y: coord.y});
                            touchedQueue[hash] = true;
                        }
                        ds[t] = Infinity;
                    }
                }
            }

            return Math.min.apply(null, ds) + 1;
        };

        toVisit.push({x: startx, y: starty});
        touchedQueue[startx + ',' + starty] = true;

        // do first one to avoid Infinity problems
        let next = toVisit.pop();
        distanceGrid[next.x][next.y] = 0;
        addNeighborsToQueueAndGetNextDist(next.x, next.y);

        while (toVisit.length > 0) {
            next = toVisit.pop();
            let nextDist = addNeighborsToQueueAndGetNextDist(next.x, next.y);
            if (nextDist > maxDist) {
                maxDist = nextDist;
                maxDistCoord.x = next.x;
                maxDistCoord.y = next.y;
            }
            distanceGrid[next.x][next.y] = nextDist;
        }
        return {
            grid: distanceGrid,
            maxDistCoord: maxDistCoord
        };
    }

    app.makeDistanceGrid = makeDistanceGrid;
})();

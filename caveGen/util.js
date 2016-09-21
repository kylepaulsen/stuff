'use strict';

(function() {
    const util = {};
    window.util = util;

    util.makeMatrix = function(width, height, fillVal) {
        fillVal = fillVal || 0;
        var mat = [];
        for (var x = 0; x < width; ++x) {
            mat[x] = [];
            for (var y = 0; y < height; ++y) {
                mat[x][y] = fillVal;
            }
        }
        return mat;
    };

    util.randInt = function(low, high) {
        return Math.floor(app.randomGenerator.random() * (high - low + 1)) + low;
    };

    util.taxicabDist = function(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    };

    util.safeMatrixGet = function(mat, x, y, outOfBoundsValue) {
        const cols = mat.length;
        const rows = mat[0].length;
        if (x < 0 || x > cols - 1 || y < 0 || y > rows - 1) {
            return outOfBoundsValue;
        }
        return mat[x][y];
    };

    util.searchMatrixInArea = function(mat, lookingFor, cx, cy, size) {
        const minx = cx - size;
        const maxx = cx + size;
        const miny = cy - size;
        const maxy = cy + size;
        for (let x = minx; x <= maxx; x++) {
            for (let y = miny; y <= maxy; y++) {
                if (util.safeMatrixGet(mat, x, y, undefined) === lookingFor) {
                    return {x: x, y: y};
                }
            }
        }
    };
})();

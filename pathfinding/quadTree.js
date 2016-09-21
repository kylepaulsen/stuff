function quadTreeDecompose(canvas) {
    "use strict";
    var ctx = canvas.getContext("2d");
    var quadTreeMaxLevel = 8;
    var width = canvas.width;
    var height = canvas.height;
    var imageData = ctx.getImageData(0, 0, width, height);
    var data = imageData.data;
    var dataStride = width * 4;
    var finalCells = [];

    var makeCell = (function() {
        var id = 0;
        return function(x, y, w, h, l) {
            var x = x || 0;
            var y = y || 0;
            var w = w || width;
            var h = h || height;
            return {
                id: id++,
                x: x,
                y: y,
                width: w,
                height: h,
                cx: x + (w >> 1),
                cy: y + (h >> 1),
                level: l || 0,
                wall: false,
                children: null,
                neighbors: {}
            };
        };
    })();

    var checkCell = function(cell) {
        var w = cell.width - 1;
        var h = cell.height - 1;
        var resetStride = dataStride - w * 4;
        var idx = cell.y * dataStride + cell.x * 4 + 3;
        var lookingForWall = data[idx] === 0;
        for (var dy = 0; dy < h; ++dy) {
            for (var dx = 0; dx < w; ++dx) {
                if ((lookingForWall && data[idx] !== 0) ||
                    (!lookingForWall && data[idx] === 0)) {

                    if (cell.level >= quadTreeMaxLevel) {
                        cell.wall = true;
                        return false;
                    }
                    return true;
                }
                idx += 4;
            }
            idx += resetStride;
        }
        if (!lookingForWall) {
            cell.wall = true;
        }
        return false;
    };

    var decompose = function(cell) {
        var wWidth = cell.width >> 1;
        var eWidth = cell.width - wWidth;
        var nHeight = cell.height >> 1;
        var sHeight = cell.height - nHeight;
        var nextLevel = cell.level + 1;
        var nw = makeCell(cell.x, cell.y, wWidth, nHeight, nextLevel);
        var ne = makeCell(cell.x + wWidth, cell.y, eWidth, nHeight, nextLevel);
        var se = makeCell(cell.x + wWidth, cell.y + nHeight, eWidth, sHeight, nextLevel);
        var sw = makeCell(cell.x, cell.y + nHeight, wWidth, sHeight, nextLevel);
        cell.children = [nw, ne, se, sw];
        toCheck.push(nw, ne, se, sw);
    };

    var findQuadLeafFromPoint = function(x, y) {
        var currentChildren = [root];
        while (currentChildren.length > 0) {
            var child = currentChildren.pop();
            var childEndX = child.x + child.width;
            var childEndY = child.y + child.height;
            if (x >= child.x && x < childEndX && y >= child.y && y < childEndY) {
                currentChildren = [];
                if (child.children) {
                    currentChildren.push(child.children[0], child.children[1],
                        child.children[2], child.children[3]);
                } else {
                    return child;
                }
            }
        }
        return null;
    };

    // init
    var root = makeCell();

    var toCheck = [root];

    console.time("buildTree");
    var nextCell;
    while (toCheck.length > 0) {
        nextCell = toCheck.pop();
        if (checkCell(nextCell)) {
            decompose(nextCell);
        } else {
            finalCells.push(nextCell);
        }
    }
    console.timeEnd("buildTree");


    var buildGraph = function() {
        var t = finalCells.length;
        var x, y, maxX, maxY;
        while (t-- > 0) {
            var cell = finalCells[t];
            var potentialNeighbor;

            if (cell.wall) {
                continue;
            }

            maxX = cell.x + cell.width;
            maxY = cell.y + cell.height;

            // Connect to cells to the north
            x = cell.x;
            y = cell.y - 1;
            while (x < maxX) {
                potentialNeighbor = findQuadLeafFromPoint(x, y);
                if (potentialNeighbor) {
                    if (!potentialNeighbor.wall) {
                        cell.neighbors[potentialNeighbor.id] = potentialNeighbor;
                    }
                    x = potentialNeighbor.x + potentialNeighbor.width;
                } else {
                    break;
                }
            }

            // Connect to cell to the NE
            x = cell.x + cell.width;
            y = cell.y - 1;
            potentialNeighbor = findQuadLeafFromPoint(x, y);
            if (potentialNeighbor && !potentialNeighbor.wall) {
                cell.neighbors[potentialNeighbor.id] = potentialNeighbor;
            }

            // Connect to cells to the east
            x = cell.x + cell.width;
            y = cell.y;
            while (y < maxY) {
                potentialNeighbor = findQuadLeafFromPoint(x, y);
                if (potentialNeighbor) {
                    if (!potentialNeighbor.wall) {
                        cell.neighbors[potentialNeighbor.id] = potentialNeighbor;
                    }
                    y = potentialNeighbor.y + potentialNeighbor.height;
                } else {
                    break;
                }
            }

            // Connect to cell to the SE
            x = cell.x + cell.width;
            y = cell.y + cell.height;
            potentialNeighbor = findQuadLeafFromPoint(x, y);
            if (potentialNeighbor && !potentialNeighbor.wall) {
                cell.neighbors[potentialNeighbor.id] = potentialNeighbor;
            }

            // Connect to cells to the south
            x = cell.x;
            y = cell.y + cell.height;
            while (x < maxX) {
                potentialNeighbor = findQuadLeafFromPoint(x, y);
                if (potentialNeighbor) {
                    if (!potentialNeighbor.wall) {
                        cell.neighbors[potentialNeighbor.id] = potentialNeighbor;
                    }
                    x = potentialNeighbor.x + potentialNeighbor.width;
                } else {
                    break;
                }
            }

            // Connect to cell to the SW
            x = cell.x - 1;
            y = cell.y + cell.height;
            potentialNeighbor = findQuadLeafFromPoint(x, y);
            if (potentialNeighbor && !potentialNeighbor.wall) {
                cell.neighbors[potentialNeighbor.id] = potentialNeighbor;
            }

            // Connect to cells to the west
            x = cell.x - 1;
            y = cell.y;
            while (y < maxY) {
                potentialNeighbor = findQuadLeafFromPoint(x, y);
                if (potentialNeighbor) {
                    if (!potentialNeighbor.wall) {
                        cell.neighbors[potentialNeighbor.id] = potentialNeighbor;
                    }
                    y = potentialNeighbor.y + potentialNeighbor.height;
                } else {
                    break;
                }
            }

            // Connect to cell to the NW
            x = cell.x - 1;
            y = cell.y - 1;
            potentialNeighbor = findQuadLeafFromPoint(x, y);
            if (potentialNeighbor && !potentialNeighbor.wall) {
                cell.neighbors[potentialNeighbor.id] = potentialNeighbor;
            }
        }
    };
    console.time("buildGraph");
    buildGraph();
    console.timeEnd("buildGraph");


    var drawCells = function(ctx) {
        console.time("drawCells");
        ctx.lineWidth = 1;
        finalCells.forEach(function(cell) {
            if (cell.wall) {
                ctx.strokeStyle = "#ff0000";
            } else {
                ctx.strokeStyle = "#0000ff";
            }
            ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
        });
        console.timeEnd("drawCells");
    };

    return {
        root: root,
        findQuadLeafFromPoint: findQuadLeafFromPoint,
        drawCells: drawCells
    };
}

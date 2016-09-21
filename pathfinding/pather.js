var pather = function(pathPoints) {
    "use strict";
    var totalDistance = 0;
    var distances = [];
    var percentToIndex = [0];

    var dist = function(pt1, pt2) {
        var xDiff = pt1.x - pt2.x;
        var yDiff = pt1.y - pt2.y;
        return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
    };

    var calcPathData = function() {
        var len = pathPoints.length - 1;
        var t = 0;
        var x;

        for (x = 0; x < len; ++x) {
            var d = dist(pathPoints[x], pathPoints[x + 1]);
            distances.push(d);
            totalDistance += d;
        }

        for (x = 0; x < len; ++x) {
            t += distances[x] / totalDistance;
            percentToIndex.push(t);
        }
        //percentToIndex.push(1);
    };
    calcPathData();

    var arrayBinarySearch = function(arr, val) {
        var arrLen = arr.length;
        var idx = Math.min(Math.floor(arrLen / 2), arrLen - 2);
        var idxDelta = Math.max(Math.floor(arrLen / 4), 1);
        --arrLen;

        var lessThanCurrent = val < arr[idx];
        var greaterThanNext = val >= arr[idx + 1];
        var fails = 0;
        while (lessThanCurrent || greaterThanNext) {
            if (lessThanCurrent) {
                idx -= idxDelta;
            } else if (greaterThanNext) {
                idx += idxDelta;
            } else {
                break;
            }
            if (idx < 0 || idx >= arrLen) {
                idx = Math.max(Math.min(idx, arrLen - 1), 0);
                ++fails;
            }
            if (fails > 3) {
                return undefined;
            }
            lessThanCurrent = val < arr[idx];
            greaterThanNext = val >= arr[idx + 1];
            idxDelta = Math.ceil(idxDelta / 2);
        }
        if (idx !== arrLen) {
            return idx;
        }
    };

    var getPositionFromP = function(p) {
        p = Math.max(Math.min(p, 1), 0);
        var start;
        var end;
        var startPt;
        var endPt;
        var percentInSegment;

        var x = arrayBinarySearch(percentToIndex, p);
        if (x === undefined) {
            x = percentToIndex.length - 2;
        }
        start = percentToIndex[x];
        end = percentToIndex[x + 1];
        percentInSegment = (p - start) / (end - start);
        percentInSegment = Math.max(Math.min(percentInSegment, 1), 0);
        startPt = pathPoints[x];
        endPt = pathPoints[x + 1];

        return {
            x: startPt.x + (endPt.x - startPt.x) * percentInSegment,
            y: startPt.y + (endPt.y - startPt.y) * percentInSegment
        };
    };

    var getTotalDistance = function() {
        return totalDistance;
    };

    return {
        getPositionFromP: getPositionFromP,
        getTotalDistance: getTotalDistance
    };
};

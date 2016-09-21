function $(query) {
    return document.querySelector(query);
}

function listen(ele, type, handler) {
    ele.addEventListener(type, handler, false);
}

function makeMatrix(width) {
    var mat = [];
    for (var t=0; t<width; ++t) {
        mat[t] = [];
    }
    return mat;
}

function pickValueInRange(rangeObjs, value) {
    var numRangeObjs = rangeObjs.length;
    var offsetRange = 0;
    var rangeObj;
    for (var t=0; t<numRangeObjs; ++t) {
        rangeObj = rangeObjs[t];
        if (value <= offsetRange + rangeObj.rate) {
            return rangeObj.val;
        } else {
            offsetRange += rangeObj.rate;
        }
    }
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

module.exports = {
    $: $,
    listen: listen,
    makeMatrix: makeMatrix,
    pickValueInRange: pickValueInRange,
    clamp: clamp
}

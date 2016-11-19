const locToIdx = {
    R: 1,
    G: 2,
    B: 3,
    X: 4,
    Y: 5,
    T: 6
};
function loc(idx, isPointer) {
    idx = locToIdx[idx] || parseInt(idx);
    return {
        val: idx,
        type: isPointer ? 'pointer' : 'normal'
    };
}

function evalLocation(cpuData, dest) {
    if (dest.type === 'pointer') {
        const pointerVal = cpuData.mem[dest.val];
        if (typeof pointerVal === 'number' && pointerVal > -1 && pointerVal < cpuData.maxMem) {
            return pointerVal;
        } else {
            return -1;
        }
    } else {
        return dest.val;
    }
}

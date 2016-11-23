function JumpEqualInst(location, jumpTo) {
    this.jumpTo = jumpTo;
    this.location = location;
    this.type = 'jumpEqualInst';
}
JumpEqualInst.prototype.run = function(cpuData) {
    const val1 = cpuData.mem[0];
    const memIdx = this.location.val;//evalLocation(cpuData, this.location);
    let err;
    if (memIdx > -1) {
        if (val1 === cpuData.mem[memIdx]) {
            cpuData.instructionPointer = this.jumpTo;
        }
    } else {
        err = 'Bad memory location.';
    }
    return err;
};

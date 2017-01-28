function SubtractInst(location) {
    this.location = location;
    this.type = 'subtractInst';
}
SubtractInst.prototype.run = function(cpuData) {
    const val1 = cpuData.mem[0];
    const memIdx = this.location.val;//evalLocation(cpuData, this.location);
    let err;
    if (memIdx > -1) {
        cpuData.mem[0] = val1 - cpuData.mem[memIdx];
    } else {
        err = 'Bad memory location.';
    }
    return err;
};

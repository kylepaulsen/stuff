function DistanceInst(location) {
    this.location = location;
    this.type = 'distanceInst';
}
DistanceInst.prototype.run = function(cpuData) {
    const val1 = cpuData.mem[0];
    const memIdx = this.location.val;//evalLocation(cpuData, this.location);
    let err;
    if (memIdx > -1) {
        cpuData.mem[0] = Math.abs(val1 - cpuData.mem[memIdx]);
    } else {
        err = 'Bad memory location.';
    }
    return err;
};

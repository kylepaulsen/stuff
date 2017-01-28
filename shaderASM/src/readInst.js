function ReadInst(location) {
    this.location = location;
    this.type = 'readInst';
}
ReadInst.prototype.run = function(cpuData) {
    const memIdx = this.location.val;//evalLocation(cpuData, this.location);
    let err;
    if (memIdx > -1) {
        cpuData.mem[0] = cpuData.mem[memIdx];
    } else {
        err = 'Bad memory location.';
    }
    return err;
};

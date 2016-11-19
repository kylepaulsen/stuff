function ReadInst(location) {
    this.location = location;
    this.type = 'readInst';
}
ReadInst.prototype.run = function(cpuData) {
    const memIdx = evalLocation(cpuData, this.location);
    let err;
    if (memIdx > -1) {
        cpuData.mem[0] = cpuData.mem[memIdx];
    } else {
        err = 'Tried to use something at ' + this.location.val + ' as a memory location.';
    }
    return err;
};

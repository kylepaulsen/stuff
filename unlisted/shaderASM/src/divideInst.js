function DivideInst(location) {
    this.location = location;
    this.type = 'addInst';
}
DivideInst.prototype.run = function(cpuData) {
    const val1 = cpuData.mem[0];
    const memIdx = evalLocation(cpuData, this.location);
    let err;
    if (memIdx > -1) {
        cpuData.mem[0] = val1 / cpuData.mem[memIdx];
    } else {
        err = 'Tried to use something at ' + this.location.val + ' as a memory location.';
    }
    return err;
};

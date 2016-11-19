function StoreInst(location) {
    this.location = location;
    this.type = 'storeInst';
}
StoreInst.prototype.run = function(cpuData) {
    const val = cpuData.mem[0];
    const memIdx = evalLocation(cpuData, this.location);
    let err;
    if (memIdx > -1) {
        cpuData.mem[memIdx] = val;
    } else {
        err = 'Tried to use something at ' + this.location.val + ' as a memory location.';
    }
    return err;
};

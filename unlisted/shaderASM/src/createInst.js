function CreateInst(val) {
    this.val = val;
    this.type = 'createInst';
}
CreateInst.prototype.run = function(cpuData) {
    cpuData.mem[0] = this.val;
};

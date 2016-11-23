function JumpInst(jumpTo) {
    this.jumpTo = jumpTo;
    this.type = 'jumpInst';
}
JumpInst.prototype.run = function(cpuData) {
    cpuData.instructionPointer = this.jumpTo;
};

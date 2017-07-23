function loadFromJSON(str) {
    let d = JSON.parse(str);
    let asmStr = '';

    let cmd2asm = {
        readCmd: 'loa',
        storeCmd: 'set',
        createCmd: 'def',
        addCmd: 'add',
        subtractCmd: 'sub',
        multiplyCmd: 'mul',
        divideCmd: 'div',
        distanceCmd: 'dis',
        modCmd: 'mod',
        jumpCmd: 'jmp',
        jumpEqual: 'jeq',
        jumpLessThan: 'jlt',
        pixelOutCmd: 'out'
    };

    d.forEach(function(c) {
        let classes = c.className.split(' ');
        let cmd = classes[0];
        let asm = cmd2asm[cmd];
        let lineParts = [asm];
        if (asm === 'jmp') {
            let cmd2 = classes[1];
            if (cmd2asm[cmd2]) {
                asm = cmd2asm[cmd2];
                lineParts[0] = asm;
            }
        }
        if (c.val) {
            lineParts.push(c.val.toLowerCase());
        }
        if (c.jumpId !== undefined) {
            lineParts.push('#j' + c.jumpId);
        }
        if (cmd === 'jumpEnd') {
            lineParts = ['\n#j' + c.jumpId];
        }
        asmStr += lineParts.join(' ') + '\n';
    });
    return asmStr;
}

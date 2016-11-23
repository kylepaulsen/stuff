function pixelVisionCPU(canvas) {
    const MAXMEM = 16;
    const MAX_ALLOWED_INST = 999;
    const cpuData = {
        maxMem: MAXMEM,
        instructions: [],
        mem: new Uint8Array(MAXMEM),
        instructionPointer: 0
    };

    const ctx = canvas.getContext('2d');
    let width;
    let height;
    let imgDataObj;
    let imgData;
    let imgDataSize;
    let frame;
    let requestedFrame;

    const run = function() {
        width = canvas.width;
        height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        imgDataObj = ctx.getImageData(0, 0, width, height);
        imgData = imgDataObj.data;
        imgDataSize = imgData.length;
        frame = 0;

        render();
    };

    const render = function() {
        //console.time('render time');
        let x = 0;
        let y = height;
        let idx = 0;
        let err;
        cpuData.mem = new Uint8Array(cpuData.maxMem);

        while (idx < imgDataSize) {
            const mem = cpuData.mem;
            cpuData.instructionPointer = 0;

            // feed in initial data.
            mem[1] = imgData[idx];
            mem[2] = imgData[idx + 1];
            mem[3] = imgData[idx + 2];
            mem[4] = x;
            mem[5] = y;
            mem[6] = frame;

            let instructionsSinceLastPixelOut = 0;
            let nextInst = cpuData.instructions[cpuData.instructionPointer++];
            while (nextInst && nextInst.type !== 'pixelOut') {
                err = nextInst.run(cpuData);
                if (instructionsSinceLastPixelOut > MAX_ALLOWED_INST) {
                    err = 'Might be in infinite loop! Emergency break!';
                }
                if (err) {
                    break;
                }
                nextInst = cpuData.instructions[cpuData.instructionPointer++];
                instructionsSinceLastPixelOut++;
            }
            if (!nextInst) {
                err = 'Didn\'t get a pixel out!';
            }
            if (err) {
                break;
            }
            instructionsSinceLastPixelOut = 0;

            const newIdx = 4 * ((height - mem[5]) * width + mem[4]);
            imgData[newIdx] = mem[1];
            imgData[newIdx + 1] = mem[2];
            imgData[newIdx + 2] = mem[3];
            imgData[newIdx + 3] = 255;
            frame = mem[6];

            x++;
            if (x >= width) {
                x = 0;
                y--;
            }
            idx = idx + 4;
        }

        if (err) {
            throw err;
        }

        ctx.putImageData(imgDataObj, 0, 0);
        //console.timeEnd('render time');
        frame++;

        requestedFrame = requestAnimationFrame(render);
    };

    const stop = function() {
        if (requestedFrame) {
            cancelAnimationFrame(requestedFrame);
            requestedFrame = undefined;
        }
    };

    const nextFrame = function() {
        render();
        stop();
    };

    return {
        cpuData,
        run,
        nextFrame,
        stop
    };
}

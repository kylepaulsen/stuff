const canvas = document.createElement('canvas');
const width = window.innerWidth;
const height = window.innerHeight;

canvas.width = width;
canvas.height = height;
canvas.style.position = 'absolute';
canvas.style.top = 0;
canvas.style.left = 0;
const ctx = canvas.getContext('2d');

ctx.strokeStyle = "#fff";

document.body.appendChild(canvas);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = "#000";
document.body.style.color = "#fff";
document.body.userSelect = 'none';

let mouseDown = false;

let lastX;
let lastY;

const handleStartLine = (e) => {
    mouseDown = true;
    const x = e.touches?.[0]?.clientX ?? e.clientX;
    const y = e.touches?.[0]?.clientY ?? e.clientY;
    ctx.moveTo(x, y);
    ctx.beginPath();
};

const handleDrawLine = (e) => {
    if (mouseDown) {
        e.preventDefault();
        const x = e.touches?.[0]?.clientX ?? e.clientX;
        const y = e.touches?.[0]?.clientY ?? e.clientY;
        if (x !== lastX || y !== lastY) {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        lastX = x;
        lastY = y;
    }
};

const handleEndLine = () => {
    mouseDown = false;
};

canvas.addEventListener('touchstart', handleStartLine);
canvas.addEventListener('mousedown', handleStartLine);
canvas.addEventListener('touchmove', handleDrawLine);
canvas.addEventListener('mousemove', handleDrawLine);
canvas.addEventListener('touchend', handleEndLine);
canvas.addEventListener('mouseup', handleEndLine);

const clearBtn = document.querySelector('#clear');
clearBtn.style.position = 'fixed';
clearBtn.style.bottom = '0px';
clearBtn.style.left = '0px';
clearBtn.style.zIndex = 1;
clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, width, height);
});

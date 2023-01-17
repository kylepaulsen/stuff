const canvas = document.createElement('canvas');
const width = window.innerWidth;
const height = window.innerHeight;

canvas.width = width;
canvas.height = height;
const ctx = canvas.getContext('2d');

ctx.strokeStyle = "#fff";

document.body.appendChild(canvas);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = "#000";
document.body.style.color = "#fff";

let mouseDown = false;

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
        ctx.lineTo(x, y);
        ctx.stroke();
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

document.querySelector("#test").addEventListener("click", () => {
    fetch("https://kylepaulsen.com").then(res => res.text()).then(data => {
        alert(data.substring(0, 100));
    });
});

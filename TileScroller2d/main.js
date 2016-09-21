var util = require("./util");
var Map = require("./Map");

var listen = util.listen;

var canvasSize = {
    width: window.innerWidth,
    height: window.innerHeight
};
var canvas = document.createElement("canvas");
var ctx;
var randomSeed = Math.random();
var map = Map(randomSeed, 80);
var mouseDown = false;
var mouseDownPt;
var mapPositionOnDown;
var upscale = 2;

function drawMap() {
    // element, imgX, imgY, imgWidth, imgHeight, posX, posY, stretchX, stretchY
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.drawImage(map.layer1, map.position.x, map.position.y, canvasSize.width,
        canvasSize.height, 0, 0, canvasSize.width, canvasSize.height);
    ctx.drawImage(map.layer2, map.position.x, map.position.y, canvasSize.width,
        canvasSize.height, 0, 0, canvasSize.width, canvasSize.height);
}

function downHandler(e) {
    if (navigator.userAgent.match(/Android/i)) {
        e.preventDefault();
    }
    var x = e.pageX;
    var y = e.pageY;
    if (e.targetTouches) {
        x = e.targetTouches[0].pageX;
        y = e.targetTouches[0].pageY;
    }
    mouseDown = true;
    mouseDownPt = {x: x, y: y};
    mapPositionOnDown = {
        x: map.position.x,
        y: map.position.y
    };
}

function upHandler(e) {
    mouseDown = false;
}

function moveHandler(e) {
    if (navigator.userAgent.match(/Android/i)) {
        e.preventDefault();
    }
    if (!mouseDown) {
        e.preventDefault();
        return false;
    }

    var x = e.pageX;
    var y = e.pageY;
    if (e.targetTouches) {
        x = e.targetTouches[0].pageX;
        y = e.targetTouches[0].pageY;
    }

    var dx = (x - mouseDownPt.x) / upscale;
    var dy = (y - mouseDownPt.y) / upscale;

    var mapImageSize = map.tileSize * map.size;
    map.position.x = util.clamp(mapPositionOnDown.x - dx, 0, mapImageSize - canvasSize.width / upscale);
    map.position.y = util.clamp(mapPositionOnDown.y - dy, 0, mapImageSize - canvasSize.height / upscale);

    drawMap();
}

canvas.width = canvasSize.width / upscale;
canvas.height = canvasSize.height / upscale;
canvas.style.width = canvasSize.width + "px";
canvas.style.height = canvasSize.height + "px";
ctx = canvas.getContext("2d");
document.body.appendChild(canvas);

map.generate();
map.draw();


if ('ontouchstart' in document.documentElement) {
    listen(document, "touchstart", downHandler);
    listen(document, "touchend", upHandler);
    listen(document, "touchmove", moveHandler);
} else {
    listen(document, "mousedown", downHandler);
    listen(document, "mouseup", upHandler);
    listen(document, "mousemove", moveHandler);
}

drawMap();

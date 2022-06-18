import * as itemStore from "../itemStore.js";
import * as p2p from "../p2p.js";

const { paper } = window;

const rectangleTool = new paper.Tool();

let mouseDown = false;
let currentPath;
let firstPoint;
let secondPoint;

const drawRectangle = (point, isSquare = false) => {
    if (currentPath) {
        currentPath.remove();
        currentPath = null;
    }

    const p = { x: point.x, y: point.y };
    if (isSquare) {
        const xDiff = p.x - firstPoint.x;
        const yDiff = p.y - firstPoint.y;
        if (Math.abs(xDiff) > Math.abs(yDiff)) {
            p.x = firstPoint.x + xDiff;
            p.y = firstPoint.y + Math.sign(xDiff) * Math.sign(yDiff) * xDiff;
        } else {
            p.y = firstPoint.y + yDiff;
            p.x = firstPoint.x + Math.sign(xDiff) * Math.sign(yDiff) * yDiff;
        }
    }

    currentPath = new paper.Path.Rectangle(firstPoint, p);
    currentPath.strokeColor = paper.settings.strokeColor;
    currentPath.strokeWidth = paper.settings.strokeWidth;
    currentPath.fillColor = paper.settings.fillColor;
};

rectangleTool.onMouseDown = (e) => {
    mouseDown = true;
    firstPoint = e.point;
};

rectangleTool.onMouseMove = (e) => {
    if (!mouseDown) {
        return;
    }
    secondPoint = e.point;
    drawRectangle(secondPoint, e.modifiers.control);
};

rectangleTool.onMouseUp = () => {
    itemStore.storeItem(currentPath);
    p2p.sendCommand("newRect", { uuid: currentPath.uuid, data: currentPath.exportJSON() });

    mouseDown = false;
    currentPath = null;
};

rectangleTool.onKeyDown = (e) => {
    if (currentPath && e.modifiers.control) {
        drawRectangle(secondPoint, true);
    }
};

rectangleTool.onKeyUp = () => {
    if (currentPath) {
        drawRectangle(secondPoint);
    }
};

rectangleTool.cursor = 'crosshair';

p2p.registerCommand("newRect", (msg) => {
    const newPath = new paper.Path.Rectangle();
    newPath.importJSON(msg.data);
    newPath.uuid = msg.uuid;
    itemStore.storeItem(newPath);
});

export default rectangleTool;

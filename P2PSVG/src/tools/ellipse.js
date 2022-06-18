import * as itemStore from "../itemStore.js";
import * as p2p from "../p2p.js";

const { paper } = window;

const ellipseTool = new paper.Tool();

let mouseDown = false;
let currentPath;
let firstPoint;
let secondPoint;

const drawEllipse = (point, isCircle = false) => {
    if (currentPath) {
        currentPath.remove();
        currentPath = null;
    }

    const p = { x: point.x, y: point.y };
    if (isCircle) {
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

    const rect = new paper.Rectangle(firstPoint.x, firstPoint.y,
        p.x - firstPoint.x, p.y - firstPoint.y);
    currentPath = new paper.Path.Ellipse({
        rectangle: rect,
        strokeColor: paper.settings.strokeColor,
        strokeWidth: paper.settings.strokeWidth,
        fillColor: paper.settings.fillColor
    });
};

ellipseTool.onMouseDown = (e) => {
    mouseDown = true;
    firstPoint = e.point;
};

ellipseTool.onMouseMove = (e) => {
    if (!mouseDown) {
        return;
    }
    secondPoint = e.point;
    drawEllipse(secondPoint, e.modifiers.control);
};

ellipseTool.onMouseUp = () => {
    itemStore.storeItem(currentPath);
    p2p.sendCommand("newEllipse", { uuid: currentPath.uuid, data: currentPath.exportJSON() });
    mouseDown = false;
    currentPath = null;
};

ellipseTool.onKeyDown = (e) => {
    if (currentPath && e.modifiers.control) {
        drawEllipse(secondPoint, true);
    }
};

ellipseTool.onKeyUp = () => {
    if (currentPath) {
        drawEllipse(secondPoint);
    }
};

ellipseTool.cursor = 'crosshair';

p2p.registerCommand("newEllipse", (msg) => {
    const newPath = new paper.Path.Ellipse();
    newPath.importJSON(msg.data);
    newPath.uuid = msg.uuid;
    itemStore.storeItem(newPath);
});

export default ellipseTool;

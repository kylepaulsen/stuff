import * as itemStore from "../itemStore.js";
import * as p2p from "../p2p.js";

const { paper } = window;

const lineTool = new paper.Tool();

lineTool.settings = {
    anchorAngle: 0 * Math.PI / 180,
    anchorDirections: 8
};

let mouseDown = false;
let currentPath;
let firstPoint;
let secondPoint;

const snapLineToAngle = (point) => {
    // project the currentPath onto the anchorAngle and set the endpoint to the projection.
    const angle = Math.atan2(firstPoint.y - point.y, point.x - firstPoint.x);
    const anchorSize = 2 * Math.PI / lineTool.settings.anchorDirections;
    const anchorAngle = Math.round((angle - lineTool.settings.anchorAngle) / anchorSize) *
        anchorSize + lineTool.settings.anchorAngle;
    const angleDiff = Math.abs(angle - anchorAngle);
    const xDiff = firstPoint.x - point.x;
    const yDiff = firstPoint.y - point.y;
    const magnitude = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
    const scale = magnitude * Math.cos(angleDiff);
    point.x = scale * Math.cos(anchorAngle) + firstPoint.x;
    point.y = -scale * Math.sin(anchorAngle) + firstPoint.y;
    currentPath.segments[1].point = point;
};

lineTool.onMouseDown = (e) => {
    mouseDown = true;
    firstPoint = e.point;
};

lineTool.onMouseMove = (e) => {
    if (!mouseDown) {
        return;
    }
    if (!currentPath) {
        currentPath = new paper.Path({
            strokeColor: paper.settings.strokeColor,
            strokeWidth: paper.settings.strokeWidth
        });
        currentPath.add(firstPoint);
        currentPath.add(e.point);
    }
    let point = e.point;
    secondPoint = { x: point.x, y: point.y };
    if (e.modifiers.control) {
        // snap endpoint to anchorAngle
        snapLineToAngle(point);
    }
    currentPath.segments[1].point = point;
};

lineTool.onMouseUp = () => {
    itemStore.storeItem(currentPath);
    p2p.sendCommand("newPath", { uuid: currentPath.uuid, data: currentPath.exportJSON() });
    mouseDown = false;
    currentPath = null;
};

lineTool.onKeyDown = (e) => {
    if (currentPath && e.modifiers.control) {
        snapLineToAngle(currentPath.segments[1].point);
    }
};

lineTool.onKeyUp = () => {
    if (currentPath) {
        currentPath.segments[1].point = secondPoint;
    }
};

lineTool.cursor = 'crosshair';

p2p.registerCommand("newPath", (msg) => {
    const newPath = new paper.Path();
    newPath.importJSON(msg.data);
    newPath.uuid = msg.uuid;
    itemStore.storeItem(newPath);
});

export default lineTool;

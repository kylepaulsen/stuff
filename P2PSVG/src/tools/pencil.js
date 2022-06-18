import * as itemStore from "../itemStore.js";
import * as p2p from "../p2p.js";

const { paper } = window;

const pencilTool = new paper.Tool();

let mouseDown = false;
let currentPath;
let firstPoint;
pencilTool.onMouseDown = (e) => {
    mouseDown = true;
    firstPoint = e.point;
};

pencilTool.onMouseMove = (e) => {
    if (!mouseDown) {
        return;
    }
    if (!currentPath) {
        currentPath = new paper.Path({
            strokeColor: paper.settings.strokeColor,
            strokeWidth: paper.settings.strokeWidth
        });
        currentPath.add(firstPoint);
    }
    currentPath.add(e.point);
};

pencilTool.onMouseUp = () => {
    mouseDown = false;
    if (currentPath) {
        currentPath.simplify(1);
        itemStore.storeItem(currentPath);
        p2p.sendCommand("newPath", { uuid: currentPath.uuid, data: currentPath.exportJSON() });
        currentPath = null;
    }
};

p2p.registerCommand("newPath", (msg) => {
    const newPath = new paper.Path();
    newPath.importJSON(msg.data);
    newPath.uuid = msg.uuid;
    itemStore.storeItem(newPath);
});

// pencilTool.cursor = 'crosshair';

export default pencilTool;

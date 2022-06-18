import * as events from "../events.js";
import * as itemStore from "../itemStore.js";
import * as p2p from "../p2p.js";

const { paper } = window;

const penTool = new paper.Tool();

let mouseDown = false;
let currentPath;
let currentSegment;

const endPath = () => {
    if (currentPath) {
        if (currentPath.segments.length > 2) {
            currentPath.selected = false;
            events.trigger("selectionChange");
            currentPath.segments.pop();

            itemStore.storeItem(currentPath);
            p2p.sendCommand("newPath", { uuid: currentPath.uuid, data: currentPath.exportJSON() });

            currentPath = null;
        } else {
            currentPath.remove();
            currentPath = null;
        }
    }
};

penTool.onMouseDown = (e) => {
    if (e.event.button === 0) {
        mouseDown = true;
        if (!currentPath) {
            currentPath = new paper.Path({
                strokeColor: paper.settings.strokeColor,
                strokeWidth: paper.settings.strokeWidth
            });
            currentSegment = currentPath.add(e.point);
            currentSegment.selected = true;
            events.trigger("selectionChange", currentSegment);
        }
    } else if (e.event.button === 2) {
        endPath();
    }
};

penTool.onMouseMove = (e) => {
    if (!currentPath) {
        return;
    }

    if (currentSegment) {
        if (mouseDown) {
            currentSegment.handleIn.x -= e.delta.x;
            currentSegment.handleIn.y -= e.delta.y;
            currentSegment.handleOut.x += e.delta.x;
            currentSegment.handleOut.y += e.delta.y;
        } else {
            currentSegment.point = e.point;
        }
    }
};

penTool.onMouseUp = (e) => {
    mouseDown = false;
    if (currentPath) {
        if (currentSegment) {
            currentSegment.selected = false;
        }
        currentSegment = currentPath.add(e.point);
        currentSegment.selected = true;
        events.trigger("selectionChange", currentSegment);
    }
};

penTool.onDeactivate = () => {
    endPath();
};

penTool.cursor = 'crosshair';

p2p.registerCommand("newPath", (msg) => {
    const newPath = new paper.Path();
    newPath.importJSON(msg.data);
    newPath.uuid = msg.uuid;
    itemStore.storeItem(newPath);
});

export default penTool;

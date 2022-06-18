import * as events from "../events.js";
import * as itemStore from "../itemStore.js";
import * as p2p from "../p2p.js";

const { paper } = window;

const pointerTool = new paper.Tool();

let currentHitResult;
let currentNonHandlesHitResult;
let lastHitSegment;

const nonHandlesHitOptions = {
    stroke: true,
    fill: true,
    tolerance: 5
};

const hitOptions = {
    segments: true,
    handles: true,
    stroke: true,
    fill: true,
    tolerance: 5,
    match: (result) => {
        const type = result.type;
        if (!result.item.selected) {
            // if selecting a new item...
            if (type === 'segment') {
                // promote clicking on a segment to a stroke
                result.type = 'stroke';
                return true;
            }
            if (type.includes('handle')) {
                if (currentNonHandlesHitResult.item === result.item) {
                    // promote clicking on a handle to a stroke
                    result.type = 'stroke';
                    return true;
                } else {
                    // clicked on some blank space somewhere that so happened to have a handle.
                    // dont select anything.
                    return false;
                }
            }
        } else if (type.includes('handle')) {
            // if selecting a handle on an already selected item...
            if (lastHitSegment !== result.segment) {
                if (currentNonHandlesHitResult.item === result.item) {
                    // segment is not already selected, so prevent editing handles
                    result.type = 'stroke';
                    return true;
                } else {
                    // clicked on some blank space somewhere that so happened to have a handle.
                    // dont select anything.
                    return false;
                }
            }
        }
        return true;
    }
};

pointerTool.onMouseDown = (e) => {
    // this extra hit test is needed to prevent the selection of a handle when clicking on blank space.
    currentNonHandlesHitResult = paper.project.hitTest(e.point, nonHandlesHitOptions) || {};
    const hitResult = paper.project.hitTest(e.point, hitOptions);
    // console.log("???", hitResult);
    if (currentHitResult) {
        currentHitResult.item.selected = false;
        if (currentHitResult.segment) {
            currentHitResult.segment.selected = false;
        }
        currentHitResult = null;
        lastHitSegment = null;
    }

    let selectedItem;
    if (hitResult) {
        currentHitResult = hitResult;
        if (hitResult.segment) {
            hitResult.segment.selected = true;
            lastHitSegment = hitResult.segment;
            events.trigger('selectionChange', hitResult.segment);
        }
        hitResult.item.selected = true;
        selectedItem = hitResult.item;

        console.log(hitResult, hitResult.type);
    }

    events.trigger('selectionChange', selectedItem);
};

pointerTool.onMouseDrag = (e) => {
    if (!currentHitResult) {
        return;
    }

    switch (currentHitResult.type) {
        case 'segment':
            currentHitResult.segment.point = e.point;
            break;
        case 'handle-in':
            currentHitResult.segment.handleIn.x += e.delta.x;
            currentHitResult.segment.handleIn.y += e.delta.y;
            break;
        case 'handle-out':
            currentHitResult.segment.handleOut.x += e.delta.x;
            currentHitResult.segment.handleOut.y += e.delta.y;
            break;
        case 'fill':
        case 'stroke':
            currentHitResult.item.position.x += e.delta.x;
            currentHitResult.item.position.y += e.delta.y;
            break;
    }
};

pointerTool.onMouseUp = () => {
    if (currentHitResult) {
        const moveData = { uuid: currentHitResult.item.uuid };
        if (currentHitResult.type === 'segment' || currentHitResult.type.includes('handle')) {
            moveData.seg = currentHitResult.segment.index;
            if (currentHitResult.type === 'handle-in') {
                moveData.handle = 'in';
                moveData.x = currentHitResult.segment.handleIn.x;
                moveData.y = currentHitResult.segment.handleIn.y;
            } else if (currentHitResult.type === 'handle-out') {
                moveData.handle = 'out';
                moveData.x = currentHitResult.segment.handleOut.x;
                moveData.y = currentHitResult.segment.handleOut.y;
            } else {
                moveData.x = currentHitResult.segment.point.x;
                moveData.y = currentHitResult.segment.point.y;
            }
        } else {
            moveData.x = currentHitResult.item.position.x;
            moveData.y = currentHitResult.item.position.y;
        }
        p2p.sendCommand('move', moveData);
    }
};

pointerTool.onKeyDown = (e) => {
    const activeEl = document.activeElement;
    if ((e.key === 'backspace' || e.key === 'delete') && activeEl.tagName !== 'INPUT') {
        if (currentHitResult) {
            if (currentHitResult.segment) {
                const segmentIdx = currentHitResult.segment.index;
                currentHitResult.segment.remove();
                p2p.sendCommand('remove', { uuid: currentHitResult.item.uuid, seg: segmentIdx });
            } else {
                currentHitResult.item.remove();
                itemStore.removeItem(currentHitResult.item);
                p2p.sendCommand('remove', { uuid: currentHitResult.item.uuid });
            }
            currentHitResult = null;
            lastHitSegment = null;
        }
    }
};

p2p.registerCommand("move", (msg) => {
    const item = itemStore.getItem(msg.uuid);
    if (item) {
        if (msg.seg !== undefined) {
            if (msg.handle === "in") {
                item.segments[msg.seg].handleIn.x = msg.x;
                item.segments[msg.seg].handleIn.y = msg.y;
            } else if (msg.handle === "out") {
                item.segments[msg.seg].handleOut.x = msg.x;
                item.segments[msg.seg].handleOut.y = msg.y;
            } else {
                item.segments[msg.seg].point.x = msg.x;
                item.segments[msg.seg].point.y = msg.y;
            }
        } else {
            item.position.x = msg.x;
            item.position.y = msg.y;
        }
    }
});

p2p.registerCommand("remove", (msg) => {
    const item = itemStore.getItem(msg.uuid);
    if (item) {
        if (msg.seg !== undefined) {
            item.segments[msg.seg].remove();
        } else {
            item.remove();
            itemStore.removeItem(item);
        }
    }
});

export default pointerTool;

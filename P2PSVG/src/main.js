import ui from "./ui.js";
import * as itemStore from "./itemStore.js";
import activateTool from "./tools/index.js";
import { parseRGBA } from "./utils.js";
import * as p2p from "./p2p.js";
import peersInit from "./peers.js";

const { paper } = window;

let initedP2P = false;
const initP2P = () => {
    initedP2P = true;
    ui.peerCount.style.display = "flex";
    p2p.initP2P(location.hash);

    p2p.registerCommand("setStrokeColor", (msg) => {
        const item = itemStore.getItem(msg.uuid);
        if (item) {
            item.strokeColor = msg.color;
        }
    });

    p2p.registerCommand("setFillColor", (msg) => {
        const item = itemStore.getItem(msg.uuid);
        if (item) {
            item.fillColor = msg.color;
        }
    });

    p2p.registerCommand("setStrokeWidth", (msg) => {
        const item = itemStore.getItem(msg.uuid);
        if (item) {
            item.strokeWidth = msg.width;
        }
    });

    p2p.registerCommand("setText", (msg) => {
        const item = itemStore.getItem(msg.uuid);
        if (item) {
            item.importJSON(msg.data);
            item.selected = false;
        } else {
            const text = new paper.PointText();
            text.uuid = msg.uuid;
            text.importJSON(msg.data);
            text.selected = false;
            itemStore.storeItem(text);
        }
    });

    peersInit();
};

const init = () => {
    paper.setup(ui.canvas);

    paper.settings.strokeColor = "rgba(255, 255, 255, 1)";
    paper.settings.fillColor = "rgba(0, 0, 0, 1)";
    paper.settings.fontSize = "24";

    ui.strokeColor.style.background = paper.settings.strokeColor;
    ui.fillColor.style.background = paper.settings.fillColor;

    activateTool("pencil");

    document.querySelectorAll(".toolBtn").forEach(element => {
        element.addEventListener("click", () => {
            activateTool(element.dataset.tool);
        });
    });

    ui.textSettingsText.addEventListener("input", () => {
        const firstSelectedText = paper.project.activeLayer.getItems({ selected: true, class: paper.PointText })[0];
        if (firstSelectedText) {
            firstSelectedText.content = ui.textSettingsText.value;
            p2p.sendCommand("setText", { uuid: firstSelectedText.uuid, data: firstSelectedText.exportJSON() });
        }
    });

    ui.textSettingsSize.addEventListener("input", () => {
        const firstSelectedText = paper.project.activeLayer.getItems({ selected: true, class: paper.PointText })[0];
        paper.settings.fontSize = ui.textSettingsSize.value;
        if (firstSelectedText) {
            firstSelectedText.fontSize = ui.textSettingsSize.value;
            p2p.sendCommand("setText", { uuid: firstSelectedText.uuid, data: firstSelectedText.exportJSON() });
        }
    });

    const colorPicker = window.makeColorPicker({ hasAlpha: true, showInputs: true });
    colorPicker.container.style.top = 0;
    colorPicker.container.style.left = "-1000px";
    document.body.appendChild(colorPicker.container);

    let colorSetting = "strokeColor";
    colorPicker.onChange((color) => {
        paper.settings[colorSetting] = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
        ui[colorSetting].style.background = paper.settings[colorSetting];
        colorPicker.container.style.borderColor = paper.settings[colorSetting];

        const selectedItems = paper.project.activeLayer.getItems({ selected: true });
        selectedItems.forEach((item) => {
            if (colorSetting === "strokeColor" && item.strokeColor) {
                item.strokeColor = paper.settings[colorSetting];
                p2p.broadcastCommandDebounced("setStrokeColor", {
                    uuid: item.uuid,
                    color: paper.settings[colorSetting]
                });
            }
            if (colorSetting === "fillColor" && item.fillColor) {
                item.fillColor = paper.settings[colorSetting];
                p2p.broadcastCommandDebounced("setFillColor", { uuid: item.uuid, color: paper.settings[colorSetting] });
            }
        });
    });

    ui.strokeColor.addEventListener("click", () => {
        colorSetting = "strokeColor";
        colorPicker.container.style.borderColor = paper.settings.strokeColor;
        const rgba = parseRGBA(paper.settings.strokeColor);
        colorPicker.setColor(rgba.r, rgba.g, rgba.b, rgba.a);
        colorPicker.container.style.top = ui.strokeColor.offsetTop + "px";
        colorPicker.container.style.left = ui.strokeColor.offsetLeft + "px";
    });

    ui.fillColor.addEventListener("click", () => {
        colorSetting = "fillColor";
        colorPicker.container.style.borderColor = paper.settings.fillColor;
        const rgba = parseRGBA(paper.settings.fillColor);
        colorPicker.setColor(rgba.r, rgba.g, rgba.b, rgba.a);
        colorPicker.container.style.top = ui.fillColor.offsetTop + "px";
        colorPicker.container.style.left = ui.fillColor.offsetLeft + "px";
    });

    ui.strokeWidth.addEventListener("input", () => {
        paper.settings.strokeWidth = ui.strokeWidth.value;

        const selectedItems = paper.project.activeLayer.getItems({ selected: true });
        selectedItems.forEach((item) => {
            if (item.strokeWidth) {
                item.strokeWidth = ui.strokeWidth.value;
                p2p.broadcastCommandDebounced("setStrokeWidth", { uuid: item.uuid, width: ui.strokeWidth.value });
            }
        });
    });

    window.addEventListener('mousedown', (e) => {
        const colorPicker = e.target.closest(".color-picker");
        if (!colorPicker) {
            document.querySelectorAll('.color-picker').forEach((el) => {
                el.style.left = "-1000px";
            });
        }
    });

    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    ui.startP2PBtn.addEventListener("click", () => {
        initP2P();
        ui.startP2PBtn.style.display = "none";
    });

    if (location.hash) {
        ui.startP2PBtn.style.display = "none";
        initP2P();
    } else {
        window.addEventListener("hashchange", () => {
            if (location.hash && !initedP2P) {
                console.log("??????????");
                ui.startP2PBtn.style.display = "none";
                initP2P();
            }
        });
    }
};

init();

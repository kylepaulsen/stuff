import * as events from "../events.js";
import * as itemStore from "../itemStore.js";
import ui from "../ui.js";
const { paper } = window;

const textTool = new paper.Tool();
let currentText;

textTool.onMouseDown = (e) => {
    if (currentText) {
        currentText.selected = false;
    }
    currentText = new paper.PointText(e.point);
    currentText.fillColor = paper.settings.fillColor;
    currentText.strokeColor = paper.settings.strokeColor;
    currentText.fontSize = paper.settings.fontSize;
    currentText.strokeWidth = paper.settings.strokeWidth;
    currentText.content = "";
    currentText.selected = true;
    events.trigger('selectionChange', currentText);
    ui.textSettingsText.focus();

    itemStore.storeItem(currentText);
};

textTool.cursor = 'text';

textTool.onActivate = () => {
    ui.toolSettingsSection.classList.add("show");
    ui.textSettings.classList.add('show');
};

textTool.onDeactivate = () => {
    if (currentText && currentText.content === '') {
        itemStore.removeItem(currentText);
        currentText.remove();
        currentText = null;
    }
};

events.on('selectionChange', (item) => {
    if (item instanceof paper.PointText) {
        ui.toolSettingsSection.classList.add("show");
        ui.textSettings.classList.add('show');
        ui.textSettingsText.value = item.content;
    } else {
        ui.toolSettingsSection.classList.remove("show");
        ui.textSettings.classList.remove('show');
    }
});

export default textTool;

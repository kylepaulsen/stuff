import * as events from "../events.js";
import ui from "../ui.js";
import pointer from "./pointer.js";
import pencil from "./pencil.js";
import pen from "./pen.js";
import line from "./line.js";
import ellipse from "./ellipse.js";
import rectangle from "./rectangle.js";
import text from "./text.js";

const { paper } = window;

const tools = {
    pointer,
    pencil,
    pen,
    line,
    ellipse,
    rectangle,
    text
};

Object.keys(tools).forEach((toolKey) => {
    const tool = tools[toolKey];
    tool.name = toolKey;
});

const activateTool = (toolStr) => {
    document.querySelector("[data-tool='" + paper.tool.name + "']").classList.remove("active");
    if (paper.tool?.onDeactivate) {
        paper.tool.onDeactivate();
    }
    ui.toolSettingsSection.classList.remove("show");
    document.querySelectorAll(".toolSettings").forEach((el) => {
        el.classList.remove("show");
    });
    paper.project.activeLayer.selected = false;
    events.trigger("selectionChange");
    const tool = tools[toolStr];
    if (tool) {
        paper.view.element.style.cursor = tool.cursor || 'default';
        tool.activate();
        document.querySelector("[data-tool='" + toolStr + "']").classList.add("active");
        if (paper.tool?.onActivate) {
            paper.tool.onActivate();
        }
    } else {
        console.log(`Unknown tool: ${toolStr}`);
    }
};

export default activateTool;

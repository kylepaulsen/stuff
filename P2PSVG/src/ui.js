const ui = {};
document.querySelectorAll("[id]").forEach(element => {
    ui[element.id] = element;
});

export default ui;

const ui = {};

const allUi = document.querySelectorAll('[data-ui]');
let x = allUi.length;

while (x--) {
	ui[allUi[x].dataset.ui] = allUi[x];
}

export default ui;

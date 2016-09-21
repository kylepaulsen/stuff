/* globals app, SeededRandom */
(function() {
    'use strict';

    const ui = {};
    {
        const allUi = document.querySelectorAll('[id]');
        let x = allUi.length;
        while (x--) {
            ui[allUi[x].id] = allUi[x];
        }
    }

    app.ui = ui;
    const canvas = ui.canvas;
    app.ctx = canvas.getContext('2d');

    let width;
    let height;
    let minTres;
    let maxTres;
    let tileSize;

    let tilesColumns;
    let tilesRows;

    const tileId2Color = {
        1: '#000000',
        2: '#6666ff',
        3: '#ff0000',
        4: '#ffff00'
    };

    function draw() {
        const ctx = app.ctx;
        const tiles = app.tiles;
        ctx.clearRect(0, 0, width, height);
        for (let x = 0; x < tilesColumns; ++x) {
            for (let y = 0; y < tilesRows; ++y) {
                let color = tileId2Color[tiles[x][y]];
                if (!color) {
                    color = '#555555';
                }
                /*if (tiles[x][y] === 1) {
                    color = 'rgb(' + ((distGrid[x][y] * 12) % 256) + ', 50, 50)';
                }*/
                ctx.fillStyle = color;
                ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            }
        }
        console.timeEnd('setup2draw');
    }

    function setup() {
        console.time('setup2draw');
        width = parseInt(ui.width.value);
        height = parseInt(ui.height.value);
        canvas.width = width;
        canvas.height = height;
        minTres = parseInt(ui.minTres.value) + 1; // +1 because we might take one away at the end.
        maxTres = parseInt(ui.maxTres.value);
        tileSize = parseInt(ui.tileSize.value);
        if (ui.random.checked) {
            ui.seed.value = Math.random();
        }

        app.randomGenerator = SeededRandom(ui.seed.value);

        tilesColumns = Math.floor(width / tileSize);
        tilesRows = Math.floor(height / tileSize);

        app.tiles = app.gen({
            cols: tilesColumns,
            rows: tilesRows,
            seed: ui.seed.value,
            minTreasures: minTres,
            maxTreasures: maxTres
        });
        draw();
    }

    ui.genBtn.addEventListener('click', setup);

    setup();
})();

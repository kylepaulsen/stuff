var SeededRandom = require("./SeededRandom");
var SimplexNoise = require("./SimplexNoise");

var util = require("./util");

function Map(seed, mapSize) {
    var randomGenerator = SeededRandom(seed);
    var tileTypeNoise = new SimplexNoise(randomGenerator.random);
    var tileSize = 32;
    var numTileColumns = mapSize;
    var numTileRows = mapSize;
    var layer1tileMat = util.makeMatrix(numTileRows);
    var layer2tileMat = util.makeMatrix(numTileRows);
    var layer1buffer = document.createElement("canvas");
    var layer1bufferContext;
    var layer2buffer = document.createElement("canvas");
    var layer2bufferContext;
    var position = {x: 0, y: 0};

    /*var overworldLayer1TileRange = [
        {rate: 0.15, val: 0}, // water
        {rate: 0.06, val: 1}, // sand
        {rate: 0.65, val: 2}, // grass
        {rate: 0.14, val: 3}, // dirt
    ];*/
    var overworldLayer1TileRange = [
        {rate: 0.25, val: 0}, // water
        {rate: 0.25, val: 1}, // sand
        {rate: 0.25, val: 2}, // grass
        {rate: 0.25, val: 3}  // dirt
    ];
    
    var overworldLayer2TileRange = [
        {rate: 0.75, val: 0}, // air
        {rate: 0.25, val: 4}  // something
    ];

    var tiles = [
        {color: "#0000ff"},
        {color: "#ffff00"},
        {color: "#00ff00"},
        {color: "#999920"},
        {color: "#000000"}
    ];

    var generate = function() {
        var val;
        var noiseZoom = 128;
        for (var row=0; row<numTileRows; ++row) {
            for (var col=0; col<numTileColumns; ++col) {
                // divide by 2 then add 0.5 to restrict the noise between [0, 1]
                val = tileTypeNoise.noise2D(row/noiseZoom, col/noiseZoom) * 0.5 + 0.5;
                layer1tileMat[row][col] = util.pickValueInRange(overworldLayer1TileRange, val);
                layer2tileMat[row][col] = util.pickValueInRange(overworldLayer2TileRange, 0);
            }
        }
    }

    var draw = function() {
        var tile;
        for (var row=0; row<numTileRows; ++row) {
            for (var col=0; col<numTileColumns; ++col) {
                tile = tiles[layer1tileMat[row][col]];
                layer1bufferContext.fillStyle = tile.color;
                layer1bufferContext.fillRect(col*tileSize, row*tileSize, tileSize, tileSize);

                if (layer2tileMat[row][col] > 0) {
                    tile = tiles[layer2tileMat[row][col]];
                    layer2bufferContext.fillStyle = tile.color;
                    layer2bufferContext.fillRect(col*tileSize, row*tileSize, tileSize, tileSize);
                }
            }
        }
    };

    layer1buffer.width = mapSize * tileSize;
    layer1buffer.height = mapSize * tileSize;
    layer1bufferContext = layer1buffer.getContext("2d");
    
    layer2buffer.width = mapSize * tileSize;
    layer2buffer.height = mapSize * tileSize;
    layer2bufferContext = layer2buffer.getContext("2d");

    return {
        draw: draw,
        generate: generate,
        layer1: layer1buffer,
        layer2: layer2buffer,
        position: position,
        tileSize: tileSize,
        size: mapSize
    };
}

module.exports = Map;

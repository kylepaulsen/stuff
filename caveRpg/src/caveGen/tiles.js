const tiles = {};
const tileId2Color = {};
const passableTiles = {};

let nextId = 0;
const makeTile = (name, color, passable = true) => {
	tiles[name] = nextId;
	tileId2Color[nextId] = color;
	if (passable) {
		passableTiles[nextId] = true;
	}
	nextId++;
};

makeTile('wall', '#555', false);
makeTile('ground', '#999');
makeTile('stairsUp', '#66f');
makeTile('stairsDown', '#f80');

export { tiles, tileId2Color, passableTiles };

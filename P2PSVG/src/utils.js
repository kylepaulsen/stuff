export const parseRGBA = (rgba) => {
    const [r, g, b, a] = rgba.match(/\d+/g);
    return { r: parseInt(r), g: parseInt(g), b: parseInt(b), a: parseFloat(a) };
};

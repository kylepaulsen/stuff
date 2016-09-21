(function(global) {
    'use strict';

    // got color data from here:
    // https://docs.google.com/spreadsheets/d/1f988o68HDvk335xXllJD16vxLBuRcmm3vg6U9lVaYpA/edit#gid=0
    // I removed special beads by commenting them. (glow, metal, transparent)

    // Some code to help parse a copy-paste from that sheet:
    /*
    var colors = [];
    sheetString.split("\n").forEach(function(data) {
        var d = data.split("\t");
        colors.push({
            name: d[0],
            r: parseInt(d[2]),
            g: parseInt(d[3]),
            b: parseInt(d[4])
        });
    });
    JSON.stringify(colors);
    */

    global.app = global.app || {};
    const app = global.app;

    app.beads = [
        {
            name: 'White',
            r: 241,
            g: 241,
            b: 241
        },
        {
            name: 'Cream',
            r: 224,
            g: 222,
            b: 169
        },
        {
            name: 'Yellow',
            r: 236,
            g: 216,
            b: 0
        },
        {
            name: 'Orange',
            r: 237,
            g: 97,
            b: 32
        },
        {
            name: 'Red',
            r: 191,
            g: 46,
            b: 64
        },
        {
            name: 'Bubblegum',
            r: 221,
            g: 102,
            b: 155
        },
        {
            name: 'Purple',
            r: 96,
            g: 64,
            b: 137
        },
        {
            name: 'Dark Blue',
            r: 43,
            g: 63,
            b: 135
        },
        {
            name: 'Dark Green',
            r: 28,
            g: 117,
            b: 62
        },
        {
            name: 'Pearl Coral',
            r: 249,
            g: 126,
            b: 121
        },
        {
            name: 'Pearl Light Blue',
            r: 122,
            g: 174,
            b: 162
        },
        {
            name: 'Pearl Green',
            r: 132,
            g: 183,
            b: 145
        },
        {
            name: 'Pearl Yellow',
            r: 202,
            g: 192,
            b: 51
        },
        {
            name: 'Pearl Light Pink',
            r: 215,
            g: 168,
            b: 162
        },
        // {
        //     name: 'Silver',
        //     r: 119,
        //     g: 123,
        //     b: 129
        // },
        {
            name: 'Light Green',
            r: 86,
            g: 186,
            b: 159
        },
        {
            name: 'Brown',
            r: 81,
            g: 57,
            b: 49
        },
        {
            name: 'Grey',
            r: 138,
            g: 141,
            b: 145
        },
        {
            name: 'Black',
            r: 46,
            g: 47,
            b: 50
        },
        {
            name: 'Rust',
            r: 140,
            g: 55,
            b: 44
        },
        {
            name: 'Light Brown',
            r: 129,
            g: 93,
            b: 52
        },
        {
            name: 'Tan',
            r: 188,
            g: 147,
            b: 113
        },
        {
            name: 'Magenta',
            r: 242,
            g: 42,
            b: 123
        },
        // {
        //     name: 'Neon Yellow',
        //     r: 220,
        //     g: 224,
        //     b: 2
        // },
        // {
        //     name: 'Neon Orange',
        //     r: 255,
        //     g: 119,
        //     b: 0
        // },
        // {
        //     name: 'Neon Green',
        //     r: 1,
        //     g: 158,
        //     b: 67
        // },
        // {
        //     name: 'Neon Pink',
        //     r: 255,
        //     g: 57,
        //     b: 145
        // },
        {
            name: 'Pastel Blue',
            r: 83,
            g: 144,
            b: 209
        },
        {
            name: 'Pastel Green',
            r: 118,
            g: 200,
            b: 130
        },
        {
            name: 'Pastel Lavender',
            r: 138,
            g: 114,
            b: 193
        },
        {
            name: 'Pastel Yellow',
            r: 254,
            g: 248,
            b: 117
        },
        {
            name: 'Chedder',
            r: 241,
            g: 170,
            b: 12
        },
        {
            name: 'Toothpaste',
            r: 147,
            g: 200,
            b: 212
        },
        {
            name: 'Hot Coral',
            r: 255,
            g: 56,
            b: 81
        },
        {
            name: 'Plum',
            r: 162,
            g: 75,
            b: 156
        },
        {
            name: 'Kiwi Lime',
            r: 108,
            g: 190,
            b: 19
        },
        {
            name: 'Cyan',
            r: 43,
            g: 137,
            b: 198
        },
        {
            name: 'Blush',
            r: 255,
            g: 130,
            b: 133
        },
        {
            name: 'Light Blue',
            r: 51,
            g: 112,
            b: 192
        },
        {
            name: 'Periwinkle Blue',
            r: 100,
            g: 124,
            b: 190
        },
        // {
        //     name: 'Glow Green',
        //     r: 190,
        //     g: 198,
        //     b: 150
        // },
        {
            name: 'Light Pink',
            r: 246,
            g: 179,
            b: 221
        },
        {
            name: 'Bright Green',
            r: 79,
            g: 173,
            b: 66
        },
        {
            name: 'Peach',
            r: 238,
            g: 186,
            b: 178
        },
        {
            name: 'Pink',
            r: 228,
            g: 72,
            b: 146
        },
        // {
        //     name: 'Gold',
        //     r: 187,
        //     g: 118,
        //     b: 52
        // },
        {
            name: 'Raspberry',
            r: 165,
            g: 48,
            b: 97
        },
        {
            name: 'Butterscotch',
            r: 212,
            g: 132,
            b: 55
        },
        {
            name: 'Parrot Green',
            r: 6,
            g: 124,
            b: 129
        },
        {
            name: 'Dark Grey',
            r: 77,
            g: 81,
            b: 86
        },
        {
            name: 'Blueberry Cream',
            r: 130,
            g: 151,
            b: 217
        },
        {
            name: 'Cranapple',
            r: 128,
            g: 50,
            b: 69
        },
        {
            name: 'Prickly Pear',
            r: 189,
            g: 218,
            b: 1
        },
        {
            name: 'Sand',
            r: 228,
            g: 182,
            b: 144
        }
    ];

})(this);

'use strict';

const path = require('path');
const fs = require('fs');

const musicDirPath = process.argv[2] || '.';
const dirs = fs.readdirSync(musicDirPath);

const files = {};

let fileNum = 1;
dirs.forEach(function(d, dIdx) {
    if (d === 'System Volume Information') {
        return;
    }
    let dirContents;
    try {
        dirContents = fs.readdirSync(path.join(musicDirPath, d));
    } catch (e) {
        if (!e.message.startsWith('ENOTDIR')) {
            console.log('READ ERR!!!', e);
        }
        return;
    }

    d = d.replace(/_/g, ' ');
    files[d] = [];

    const padZeros = function(num, digits) {
        num = num.toString();
        return '0'.repeat(Math.max(digits - num.length, 0)) + num;
    };

    // perform weird "short name" usb sort
    dirContents.sort((a, b) => a.replace(/ /g, '').toUpperCase() > b.replace(/ /g, '').toUpperCase() ? 1 : -1);

    let fileInDirIndex = 1;
    dirContents.forEach(function(f) {
        if (f.endsWith('.mp3')) {
            f = f.replace(/_/g, ' ').replace(/^[0-9.\- ]*/, '').replace(/\.mp3$/i, '');
            files[d].push(`<span class="num">${padZeros(dIdx + 1, 2)}-${padZeros(fileInDirIndex, 2)}</span> <span>(${padZeros(fileNum, 3)})</span> ${f}`);
            // files[d].push(f);
            fileInDirIndex++;
            fileNum++;
        }
    });
});

let content = '';

const folders = Object.keys(files);
folders.forEach(function(f) {
    content += `<h3 class="folderLink"><a href="#${f}">${f}</a></h3>\n`;
});

content += '<div class="clearfix"></div>\n';

folders.forEach(function(f) {
    content += `<h3><a name="${f}">${f}</a></h3>\n`;
    content += '<ul>\n';
    files[f].forEach(function(file) {
        content += `<li>${file}</li>\n`;
    });
    content += '</ul>\n';
});

let html = `<!doctype html>
<html>
<head>
    <title>Car Music Listing</title>
    <meta charset="UTF-8">
    <style>
    .clearfix {
        clear: both;
    }
    .num {
        font-weight: bold;
    }
    .folderLink {
        float: left;
        width: 50%;
    }
    </style>
</head>
<body>
    <h1>Car Music Listing</h1>
    ${content}
</body>
</html>`;

fs.writeFileSync('music.html', html);

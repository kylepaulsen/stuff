'use strict';
const fs = require('fs');
const path = require('path');

const publicFiles = fs.readdirSync(process.cwd());

const ignoreArr = [
    'index.html',
    'unlisted',
    '_push.sh',
    'test.html'
];

let indexHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Stuff | Kyle Paulsen, Software Engineer</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="More of Kyle Paulsen's small projects that were created in an afternoon for fun.">
    <meta name="author" content="Kyle Paulsen">

    <link href='https://fonts.googleapis.com/css?family=Open+Sans:400,300' rel='stylesheet' type='text/css'>
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/socialMediaIcons.css">

    <link rel="shortcut icon" href="../img/favicon.ico">
    <style>li{margin-bottom: 0px;}</style>
</head>
<body>
    <div id="top">
        <div class="page">
            <div class="logo">
                <a href="https://www.kylepaulsen.com/">
                    <img src="../img/KyleLogo.svg" alt="Kyle Paulsen">
                </a>
            </div>
            <div class="social hideOnMobile">
                <a class="icon" target="_blank" href="mailto:kyle.a.paulsen@gmail.com" rel="noopener">&#xe600;<span class="visuallyhidden">Mail</span></a>
                <a class="icon" target="_blank" href="https://www.linkedin.com/in/kylepaulsen" rel="noopener">&#xe602;<span class="visuallyhidden">LinkedIn</span></a>
                <a class="icon" target="_blank" href="https://github.com/kylepaulsen" rel="noopener">&#xe601;<span class="visuallyhidden">Github</span></a>
            </div>
        </div>
    </div>
    <div id="middle2">
        <div class="page">
            <h2>Other Random Unpolished Hacks</h2>
            <ul>{{links}}</ul>
        </div>
    </div>
</body>
</html>
`;

function getExt(file) {
    const fileNameParts = file.split('.');
    if (fileNameParts.length) {
        return fileNameParts[fileNameParts.length - 1];
    }
    return '';
}

function filterFiles(file) {
    if (ignoreArr.indexOf(file) > -1) {
        return false;
    }
    const isDir = fs.lstatSync(file).isDirectory();
    if (isDir && fs.existsSync(path.join(file, 'index.html'))) {
        return true;
    }
    if (getExt(file) === 'html') {
        return true;
    }
    return false;
}

const publicIndex = 'index.html';
let currentList;
try {
    const currentPublicMarkup = fs.readFileSync(publicIndex, 'utf8');
    currentList = currentPublicMarkup.match(/<a href="[^"]*">/g).map(function(aTag) {
        return aTag.substring(9, aTag.length - 2);
    });
    currentList.shift();
} catch (e) {
    currentList = [];
}

const linkableFiles = publicFiles.filter(filterFiles).sort(function(a, b) {
    return 2 * (b.toLowerCase() < a.toLowerCase()) - 1;
});

let linksHTML = '';
let madeChange = false;
linkableFiles.forEach(function(file) {
    linksHTML += '<li><a href="' + file + '">' + file.replace('.html', '') + '</a></li>';
    if (currentList.indexOf(file) === -1) {
        madeChange = true;
        console.log('Added ' + file);
    }
});

currentList.forEach(function(file) {
    if (linkableFiles.indexOf(file) === -1) {
        madeChange = true;
        console.log('Removed ' + file);
    }
});

if (!madeChange) {
    console.log('No changes detected. Nothing to be done.');
}

indexHTML = indexHTML.replace('{{links}}', linksHTML);

if (madeChange) {
    const targetPath = path.join(process.cwd(), publicIndex);
    fs.writeFileSync(targetPath, indexHTML);
    console.log('Wrote to file: ' + targetPath);
}

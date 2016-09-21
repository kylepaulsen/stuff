(function(global) {
    'use strict';

    global.app = global.app || {};
    const app = global.app;

    app.worker = {};

    // creates a web worker object url to be passed into new Worker();
    // mainFn is the main function that will run at the very end of the script.
    // env is an object that will have it's properties put in the global scope of
    // the worker. JSON types and functions are allowed in this object.
    app.worker.createWorkerSource = function(mainFn, env) {
        env = env || {};
        const callFunction = function(fn) {
            return '(' + fn.toString() + ')();\n';
        };

        // Using a special utf8 character in the third party zone to help
        // find where functions are defined in the stringified env object.
        const specialChar = '\uf8ff';
        let envString = JSON.stringify(env, function(k, v) {
            if (typeof v === 'function') {
                return specialChar + v.toString() + specialChar;
            }
            return v;
        });

        // need to convert stringified functions back into normal functions.
        let fnParts = envString.split('"' + specialChar);
        for (let x = 1, len = fnParts.length; x < len; x++) {
            const part = fnParts[x];
            const srcParts = part.split(specialChar + '"');
            srcParts[0] = srcParts[0].replace(/\\\\/g, specialChar)
                .replace(/\\"/g, '"').replace(new RegExp(specialChar, 'g'), '\\')
                .replace(/\/\/.*?\\n/g, '\n').replace(/\\r|\\n/g, '\n');
            fnParts[x] = srcParts.join('');
        }

        envString = fnParts.join('');

        /* global self */
        const defineVars = function() {
            Object.keys(env).forEach(function(key) {
                self[key] = env[key];
            });
        };

        let src = '"use strict"; self.window = self; var env = ' + envString + ';\n';
        src += callFunction(defineVars);
        src += callFunction(mainFn);

        const blob = new Blob([src], {type: 'text/javascript'});
        return window.URL.createObjectURL(blob);
    };

    // a function to help group data so that we can balance work among workers.
    // num is the total number of objects to be processed.
    // groups should probably be the number of workers you will be using.
    // fn is the callback that will contain the number of items in the current group
    // and the offset that describes how "far in" the data we are.
    app.worker.distribute = function(num, groups, fn) {
        const ans = [];
        const base = Math.floor(num / groups);
        let remainder = num % groups;
        let offset = 0;
        while (groups-- > 0) {
            let x = base;
            if (remainder-- > 0) {
                x++;
            }
            ans.push(fn(x, offset));
            offset += x;
        }
        return ans;
    };
})(this);

var Card = function(data, hash) {
    "use strict";
    if (!data) {
        data = {};
    }

    return {
        data: data,
        hash: hash
    };
}
var CardHashAC = (function() {
    var hashFunc = CryptoJS.SHA3;
    var promisedHashes = {};

    function addPromise(namespace, hash) {
        if (!promisedHashes[namespace]) {
            promisedHashes[namespace] = {};
        }
        promisedHashes[namespace][hash] = true;
    }

    function verifyPromise(namespace, hash, dataString) {
        if (!promisedHashes[namespace] || !promisedHashes[namespace][hash]) {
            return false;
        }
        var targetHash = hashFunc(dataString);
        if (targetHash.toString() !== hash || promisedHashes[namespace][targetHash] !== true) {
            return false;
        }
        delete promisedHashes[namespace][targetHash];
        return true;
    }

    function makeHash(dataObj) {
        var salt = randomString();
        dataObj.salt = salt;
        return hashFunc(JSON.stringify(dataObj)).toString();
    }

    function pickHashFromArray(namespace, hashes) {
        var randomHash = hashes[randInt(0, hashes.length - 1)];
        addPromise(namespace, randomHash);
        return randomHash;
    }

    function setDeck(namespace, deckHashes) {
        if (!promisedHashes[namespace]) {
            promisedHashes[namespace] = {};
        }
        promisedHashes[namespace]["deck"] = deckHashes;
    }

    function shuffleDeck(namespace, deckHashes) {
        deckHashes = randomizeArray(deckHashes);
        setDeck(namespace, deckHashes);
        return deckHashes;
    }

    function drawCard(namespace) {
        if (!promisedHashes[namespace] || !promisedHashes[namespace]["deck"] ||
          promisedHashes[namespace]["deck"].length < 1) {
            return false;
        }
        addPromise(namespace, promisedHashes[namespace]["deck"].shift());
        return true;
    }

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function randomString(numChars) {
        var str = "";
        numChars = numChars || 32;
        while (str.length < numChars) {
            str += Math.random().toString(36).slice(2);
        }
        return str.slice(0, numChars);
    }

    function randomizeArray(arr) {
        var arrLen = arr.length;
        for (var t = 0; t < arrLen; ++t) {
            var swapTarget = randInt(0, arrLen-1);
            var temp = arr[swapTarget];
            arr[swapTarget] = arr[t];
            arr[t] = temp;
        }
        return arr;
    }

    return {
        add: addPromise,
        verify: verifyPromise,
        makeHash: makeHash,
        pickHashFromArray: pickHashFromArray,
        setDeck: setDeck,
        shuffleDeck: shuffleDeck,
        drawCard: drawCard,
        randomizeArray: randomizeArray
    };
})();
var Deck = function(cardsToAdd) {
    "use strict";
    var allCards = [];
    var allHashes = [];
    var currentDeck = [];
    var hash2id = {};

    if (typeof cardsToAdd === "object") {
        addCards(cardsToAdd);
    }

    function addCard(cardData) {
        cardData.id = allCards.length;
        var hash = CardHashAC.makeHash(cardData);
        currentDeck.push(hash);
        allHashes.push(hash);
        hash2id[hash] = cardData.id;
        allCards.push(Card(cardData, hash));
    }

    function addCards(cardDataArr) {
        for (var t=0, len=cardDataArr.length; t<len; ++t) {
            addCard(cardDataArr[t]);
        }
    }

    function shuffle() {
        CardHashAC.randomizeArray(currentDeck);
        return currentDeck;
    }

    function drawCard(atIndex) {
        if (!atIndex) {
            atIndex = 0;
        }
        if (currentDeck.length > 0) {
            var hash = currentDeck.splice(atIndex, 1)[0];
            return allCards[hash2id[hash]];
        }
        return null;
    }

    function getCardById(id) {
        return allCards[id];
    }

    function numDrawableCards() {
        return currentDeck.length;
    }

    function numCards() {
        return allCards.length;
    }

    function setCurrentDeck(deck) {
        currentDeck = deck;
    }

    return {
        addCard: addCard,
        addCards: addCards,
        shuffle: shuffle,
        drawCard: drawCard,
        getCardById: getCardById,
        numDrawableCards: numDrawableCards,
        numCards: numCards,
        setCurrentDeck: setCurrentDeck
    }
}
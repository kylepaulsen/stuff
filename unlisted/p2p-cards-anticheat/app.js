document.addEventListener('DOMContentLoaded', function() {
    "use strict";

    var myDeck = Deck([
        {value: 0, color: "red"}, {value: 0, color: "blue"}, {value: 0, color: "yellow"}, {value: 0, color: "green"},
        {value: 1, color: "red"}, {value: 1, color: "blue"}, {value: 1, color: "yellow"}, {value: 1, color: "green"},
        {value: 2, color: "red"}, {value: 2, color: "blue"}, {value: 2, color: "yellow"}, {value: 2, color: "green"},
        {value: 3, color: "red"}, {value: 3, color: "blue"}, {value: 3, color: "yellow"}, {value: 3, color: "green"},
        {value: 4, color: "red"}, {value: 4, color: "blue"}, {value: 4, color: "yellow"}, {value: 4, color: "green"},
        {value: 5, color: "red"}, {value: 5, color: "blue"}, {value: 5, color: "yellow"}, {value: 5, color: "green"},
        {value: 6, color: "red"}, {value: 6, color: "blue"}, {value: 6, color: "yellow"}, {value: 6, color: "green"},
        {value: 7, color: "red"}, {value: 7, color: "blue"}, {value: 7, color: "yellow"}, {value: 7, color: "green"},
        {value: 8, color: "red"}, {value: 8, color: "blue"}, {value: 8, color: "yellow"}, {value: 8, color: "green"},
        {value: 9, color: "red"}, {value: 9, color: "blue"}, {value: 9, color: "yellow"}, {value: 9, color: "green"}
    ]);

    var channel;
    var players;
    var gameStart = false;

    function $(cssSel) {
        var result = document.querySelectorAll(cssSel);
        if (result.length === 1) {
            return result[0];
        }
        return result;
    }

    function listen(el, event, handler) {
        el.addEventListener(event, handler, false);
    }

    function log(msg) {
        var logDiv = $("#log");
        console.log(msg);
        logDiv.innerHTML = msg + "<br>" + logDiv.innerHTML;
    }

    function startWebRTC() {
        channel = new DataChannel("testRoom");
        window.channel = channel;
        players = [];
        //channel.channels[id].send()

        channel.onopen = function(userid) {
            if (!gameStart) {
                players.push(userid);
            }
            log("A user connected.");
        };

        channel.onmessage = function(message, userid) {
            var cmdObj;
            if (players.indexOf(userid) === -1) {
                //ignore commands from invalid users.
                return;
            }
            try {
                cmdObj = JSON.parse(message);
            } catch(e) {
                log("Could not parse command obj...");
                return;
            }
            log("Got command: "+cmdObj.cmd);
            var success;

            if (cmdObj.cmd === "startGame") {
                gameStart = true;
                players = cmdObj.playerList;
                players.push(userid);
                $("#startDiv").style.display = "none";
                $("#inGameDiv").style.display = "block";
                sendCommand("shuffle", {deck: myDeck.shuffle()});
            } else if(cmdObj.cmd === "shuffle") {
                var shuffledDeck = CardHashAC.shuffleDeck(userid, cmdObj.deck);
                sendCommand("shuffleDone", {deck: shuffledDeck});
            } else if(cmdObj.cmd === "shuffleDone") {
                myDeck.setCurrentDeck(cmdObj.deck);
                $("#inGameDiv").style.display = "block";
            } else if(cmdObj.cmd === "drawCard") {
                success = CardHashAC.drawCard(userid);
                if (!success) {
                    sendCommand("syncErr", {details: "Could not draw card for you on my end!"});
                }
            } else if(cmdObj.cmd === "playCard") {
                success = CardHashAC.verify(userid, cmdObj.card.hash, JSON.stringify(cmdObj.card.data));
                if (!success) {
                    sendCommand("syncErr", {details: "That card does not look valid to me."});
                    renderCard(cmdObj.card, $("#table"), true);
                } else {
                    sendCommand("playOK", {details: "That card looks OK."});
                    renderCard(cmdObj.card, $("#table"));
                }
            } else if(cmdObj.cmd === "playOK") {
                log("Play OK: "+cmdObj.details);
            } else if(cmdObj.cmd === "syncErr") {
                log("SYNC_ERR: "+cmdObj.details);
            } else {
                log("Invalid Command!!!");
            }
        };

        channel.onleave = function(userid) {
            for (var t=0; t<players.length; ++t) {
                if (players[t] === userid) {
                    players.splice(t, 1);
                }
            }
            log("A user left.");
        };
    }

    function sendCommand(command, obj, target) {
        if (!obj) {
            obj = {};
        }
        obj.cmd = command;
        log("Sending command: "+obj.cmd);
        if (!target) {
            channel.send(JSON.stringify(obj));
        } else {
            channel.channels[target].send(JSON.stringify(obj));
        }
    }

    function renderCard(card, el, bad) {
        if (!el) {
            el = $("#hand");
        }
        var cardDiv = document.createElement("div");
        cardDiv.style.border = "1px solid #000";
        cardDiv.style.marginRight = "10px";
        cardDiv.style.float = "left";
        cardDiv.style.padding = "20px";
        cardDiv.style.cursor = "pointer";
        if (bad) {
            cardDiv.style.background = "#faa";
        }
        cardDiv.dataset["id"] = card.data.id;
        cardDiv.innerHTML = card.data.value;

        el.appendChild(cardDiv);
        if (el.id === "hand") {
            listen(cardDiv, "click", function() {
                playCard(cardDiv);
            });
        }
    }

    function playCard(cardDiv) {
        var card = myDeck.getCardById(cardDiv.dataset["id"]);
        cardDiv.parentNode.removeChild(cardDiv);
        sendCommand("playCard", {card: card});
    }

    listen($("#startBtn"), "click", function() {
        $("#startDiv").style.display = "none";
        gameStart = true;
        sendCommand("startGame", {playerList: players});
        sendCommand("shuffle", {deck: myDeck.shuffle()});
    });

    listen($("#drawCardBtn"), "click", function() {
        var nextCard = myDeck.drawCard();

        renderCard(nextCard);
        sendCommand("drawCard");
    });

    listen($("#cheatBtn"), "click", function() {
        var cardDivs = $("#hand").children;
        for (var t=0; t<cardDivs.length; ++t) {
            cardDivs[t].innerHTML = "9";
            myDeck.getCardById(cardDivs[t].dataset["id"]).data.value = 9;
        }
    });

    startWebRTC();
});


const ui = {};

let bugout;

function getAllUI() {
    var allUI = document.querySelectorAll("[id]");
    var x = allUI.length;
    while (x--) {
        ui[allUI[x].id] = allUI[x];
    }
}
getAllUI();

ui.joinRoomModal.style.display = "block";

function listen(el, eventName, func) {
    el.addEventListener(eventName, func, false);
}

function addMessage(front, msg = '') {
    const newMsg = document.createElement('div');
    const frontB = document.createElement('b');
    const msgSpan = document.createElement('span');

    frontB.textContent = front;
    msgSpan.textContent = msg;

    newMsg.appendChild(frontB);
    newMsg.appendChild(msgSpan);
    ui.msgDiv.appendChild(newMsg);

    // ui.msgDiv.innerHTML += msg + "<br>";
    ui.msgDiv.scrollTop = 99999;
}

function broadcast(obj) {
    var msg = JSON.stringify(obj);
    bugout.send(msg);
}

function sendMessage() {
    addMessage("You: ", ui.msgBox.value);
    broadcast({
        cmd: "text",
        text: ui.msgBox.value
    });
    ui.msgBox.value = "";
}

var commands = {
    text: (address, data) => {
        if (address !== bugout.address()) {
            addMessage("[Peer " + address + "]: ", data.text);
        }
    }
};

let joined = false;
listen(ui.sendJoinRoomBtn, "click", async () => {
    ui.joinRoomModal.style.display = "none";
    ui.connectingModal.style.display = "block";

    bugout = new Bugout(`KyleP2PTest-${ui.joinRoomNameInput.value}`);

    bugout.on("connections", (c) => {
        ui.connectingModal.style.display = "none";
        ui.chatStuff.style.display = "block";
        if (!joined) {
            joined = true;
            addMessage("You have joined room: " + ui.joinRoomNameInput.value + " !");
        }
        console.log("Event connections:", c);
    });

    // log when a client sends a message
    bugout.on("message", (address, msg) => {
        let data = {};
        try {
            data = JSON.parse(msg);
        } catch {};
        const cmd = commands[data.cmd];
        if (cmd) {
            cmd(address, data);
        }
        console.log("Event message:", address, msg);
    });

    // log when a client makes an rpc call
    bugout.on("rpc", (address, call, args) => {
        console.log("Event rpc:", address, call, args);
    });

    // log when we see a new client address
    bugout.on("seen", (address) => {
        console.log("Event seen:", address);
        addMessage("You have connected to peer " + address + "!");
    });

    bugout.on("left", (address) => {
        console.log("Event left:", address);
        addMessage("Peer " + address + " has disconnected!");
    });
});

listen(ui.msgBox, "keydown", function(e) {
    if (e.which === 13) {
        sendMessage();
    }
});

listen(ui.sendBtn, "click", function() {
    sendMessage();
});

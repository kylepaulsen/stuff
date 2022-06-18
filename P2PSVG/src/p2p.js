let bugout;

const createRandomRoomId = () => Math.random().toString(36).substring(2, 8);

let connected = false;

const commands = {};

export const registerCommand = (command, callback) => {
    if (commands[command]) {
        console.warn(`Command ${command} already registered`);
    }
    commands[command] = callback;
};

export const initP2P = (roomId) => {
    if (!roomId) {
        roomId = createRandomRoomId();
        location.hash = roomId;
    }
    const fullRoomId = `VectorPaintP2P-${roomId.replace("#", "")}`;
    bugout = new window.Bugout(fullRoomId);

    bugout.on("connections", (e) => {
        if (connected) {
            console.log("Connections changed. Num connections: ", e);
        }
        connected = true;
    });

    bugout.on("message", (address, msg) => {
        if (address !== bugout.address()) {
            // console.log(`got message from ${address}`, msg);
            const command = commands[msg.cmd];
            if (command) {
                command(msg, address);
            }
        }
    });

    bugout.on("seen", (address) => {
        console.log(`New peer connected: ${address}`);
    });
};

export const on = (event, callback) => {
    bugout.on(event, callback);
};

// args: command, [address], message
export const sendCommand = (command, ...args) => {
    if (connected) {
        const data = args.length === 2 ? args[1] : args[0];
        data.cmd = command;
        bugout.send(...args);
    }
};

const debouncedCommands = {};
export const broadcastCommandDebounced = (command, data, ms = 300) => {
    const debouncedCommand = debouncedCommands[command];
    if (debouncedCommand) {
        clearTimeout(debouncedCommand);
    }
    debouncedCommands[command] = setTimeout(() => {
        if (connected) {
            sendCommand(command, data);
        }
        delete debouncedCommands[command];
    }, ms);
};

// args: [address], message
export const sendMessage = (...args) => {
    if (connected) {
        bugout.send(...args);
    }
};

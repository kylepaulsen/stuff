const connectWebSocket = (options = {}) => {
    const HEARTBEAT_INTERVAL = 20000;
    const { actions = {}, events = {}, url, pingMessage = '' } = options;
    const ws = new WebSocket(url);

    const checkConnection = (responseTimeout = 2000) => {
        clearTimeout(ws.timeout);
        try {
            ws.send(pingMessage);
        } catch {}
        ws.timeout = setTimeout(() => {
            console.log("Socket timed out!");
            try {
                ws.close();
            } catch {}
        }, responseTimeout);
    };

    const checkConnectionOnRefocus = () => {
        if (document.visibilityState === 'visible') {
            checkConnection(500);
        }
    };

    ws.addEventListener('open', (e) => {
        console.log('WebSocket connection opened');
        ws.heartbeatInterval = setInterval(checkConnection, HEARTBEAT_INTERVAL);

        if (events.open) {
            events.open(e, ws);
        }
    });

    ws.addEventListener('message', (e) => {
        let data = e.data;
        try {
            data = JSON.parse(data);
        } catch {}
        clearTimeout(ws.timeout);

        const action = actions[data.action];
        if (action) {
            console.log("Got action!", data);
            try {
                action(ws, data);
            } catch (e) {
                console.error(`Failed websocket action ${data.action}`, e);
            }
        }
        if (events.message) {
            events.message(e, ws);
        }
    });

    ws.addEventListener('close', () => {
        clearInterval(ws.heartbeatInterval);
        document.removeEventListener("visibilitychange", checkConnectionOnRefocus);
    });

    ws.sendJSON = (data) => {
        try {
            ws.send(JSON.stringify(data));
        } catch (e) {
            console.error("Failed to send websocket data!", data);
        }
    };

    Object.keys(events).forEach((key) => {
        if (key !== 'open' && key !== 'message') {
            ws.addEventListener(key, (e) => events[key](e, ws));
        }
    });

    document.addEventListener("visibilitychange", checkConnectionOnRefocus);

    return ws;
};

// export default connectWebSocket;

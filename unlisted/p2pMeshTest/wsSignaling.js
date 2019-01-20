{
    const init = (wsHost, peerMesh, room, claimLeader = false) => new Promise((res, rej) => {
        const ws = new WebSocket(wsHost);
        const connectFailTimeout = setTimeout(() => {
            rej('Failed to join');
        }, 60000);

        const connectedSuccessfully = () => {
            setInterval(() => {
                // send a "keepalive ping"
                ws.send('');
            }, 20000);
            res();
            clearTimeout(connectFailTimeout);
        };

        let firstPeer;

        const joinRoom = (room, offer, clientId = '') => {
            peerMesh.makeLeader(false);
            ws.send(JSON.stringify({
                cmd: 'joinRoom',
                offer,
                room,
                clientId // can pass in client id here to reconnect as a certain user.
            }));
        };

        const makeRoom = (room) => {
            peerMesh.disconnect();
            peerMesh.makeLeader();
            ws.send(JSON.stringify({
                cmd: 'makeRoom',
                room
            }));
        };

        const claimRoom = () => {
            ws.send(JSON.stringify({
                cmd: 'makeRoom',
                clientId: peerMesh.myId,
                room
            }));
        };

        ws.onopen = () => {
            // setup webrtc peer and try to join signalling room right away.
            if (!claimLeader) {
                firstPeer = peerMesh.createPeer(true);
                firstPeer.on('signal', (offer) => {
                    joinRoom(room, offer);
                });
                firstPeer.on('connect', connectedSuccessfully);
            } else {
                claimRoom();
            }
        };

        const wsCommands = {
            getOffer(data) {
                console.log('got offer:', data.offer);
                if (!peerMesh.peers.get(data.from) && data.from !== peerMesh.myId) {
                    const newPeer = peerMesh.createPeer();
                    newPeer.on('signal', (answer) => {
                        ws.send(JSON.stringify({
                            cmd: 'allowInRoom',
                            for: data.from,
                            answer,
                            from: peerMesh.myId
                        }));
                    });
                    newPeer.id = data.from;
                    newPeer.signal(data.offer);
                } else {
                    console.log('Client ID Conflict!', data.from, 'Ignoring offer...');
                }
            },
            getAnswer(data) {
                console.log('got answer:', data.answer);
                firstPeer.id = data.from;
                firstPeer.signal(data.answer);
                ws.close();
            },
            assignedID(data) {
                peerMesh.myId = data.id;
                // localStorage.clientId = data.id;
            },
            makeRoomSuccess() {
                connectedSuccessfully();
            },
            error(error) {
                if (error.type === 'joinRoom') {
                    // room didnt exist.
                    makeRoom(room);
                } else if (error.type === 'makeRoom') {
                    setTimeout(claimRoom, 1000);
                }
            }
        };

        ws.onmessage = (e) => {
            let json = {};
            try {
                json = JSON.parse(e.data);
            } catch (e) {}

            console.log('got message: ', json);

            const command = wsCommands[json.cmd];
            if (command) {
                command(json);
            }
        };

        window.addEventListener('beforeunload', () => {
            ws.close();
        });
    });

    window.wsSignaling = {
        init
    };
}

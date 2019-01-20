function createPeerMesh(opts) {
    const SimplePeer = window.SimplePeer;
    let myId;
    let joinedRoom;
    let isDisconnecting = false;

    const peers = new Map();
    const newPeers = new Map(); // map for clients that make offers so they can complete the connection later.

    let isLeader = false;
    let leaderPeer;

    const noop = () => {};
    const log = opts.debug ? console.log : noop;

    const onConnected = opts.onConnected || noop;
    const onDisconnected = opts.onDisconnected || noop;

    let peerConnectionOrderList = [];

    const introducePeerToOthers = (newPeer) => {
        const data = JSON.stringify({
            cmd: 'makeOffer',
            // this is so the leader knows who to pass the offer to (the new peer).
            forId: newPeer.id
        });
        peers.forEach((peer) => {
            if (peer !== newPeer) {
                peer.send(data);
            }
        });
    };

    const sendConnectionOrderList = () => {
        const data = JSON.stringify({
            cmd: 'connectionOrder',
            order: peerConnectionOrderList
        });
        peers.forEach((peer) => {
            peer.send(data);
        });
    };

    const peerCommands = {
        makeOffer(peer, data) { // usually existing client
            if (peer === leaderPeer) { // only trust leader
                log('I was told to make an offer for someone named: ' + data.forId);
                const newPeer = createPeer(true);
                newPeer.id = data.forId;
                newPeers.set(newPeer.id, newPeer);
                newPeer.on('signal', (offer) => {
                    peer.send(JSON.stringify({
                        cmd: 'deliverOffer',
                        forId: data.forId,
                        offer
                    }));
                });
                // new clients have 60 seconds to connect.
                setTimeout(() => {
                    newPeers.delete(newPeer.id);
                }, 60000);
            }
        },
        deliverOffer(peer, data) { // leader
            if (isLeader) {
                log('I was told to pass along an offer from someone named: ' + peer.id);
                log('Passing along the offer with a makeAnswer command to someone named: ' + data.forId);
                const targetPeer = peers.get(data.forId);
                if (targetPeer) {
                    targetPeer.send(JSON.stringify({
                        cmd: 'makeAnswer',
                        forId: peer.id,
                        offer: data.offer
                    }));
                } else {
                    console.error('no peer with id: ', data.forId);
                }
            }
        },
        makeAnswer(peer, data) { // usually new client
            if (peer === leaderPeer) { // only trust leader
                log('I was told to make an answer for someone named: ' + data.forId);
                const newPeer = createPeer();
                newPeer.id = data.forId;
                newPeer.on('signal', (answer) => {
                    peer.send(JSON.stringify({
                        cmd: 'deliverAnswer',
                        forId: data.forId,
                        answer
                    }));
                });
                newPeer.signal(data.offer);
            }
        },
        deliverAnswer(peer, data) { // leader
            if (isLeader) {
                log('I was told to pass along an answer from someone named: ' + peer.id);
                log('Passing along the answer with a recieveAnswer command to someone named: ' + data.forId);
                const targetPeer = peers.get(data.forId);
                if (targetPeer) {
                    targetPeer.send(JSON.stringify({
                        cmd: 'recieveAnswer',
                        forId: peer.id,
                        answer: data.answer
                    }));
                } else {
                    console.error('no peer with id: ', data.forId);
                }
            }
        },
        recieveAnswer(peer, data) { // usually existing client
            if (peer === leaderPeer) { // only trust leader
                log('I was told to recieve an answer for someone named: ' + data.forId);
                const targetPeer = newPeers.get(data.forId);
                if (targetPeer) {
                    targetPeer.signal(data.answer);
                }
            }
        },
        connectionOrder(peer, data) {
            if (peer === leaderPeer) {
                log('Updating connection order list.', data.order, peer.id);
                peerConnectionOrderList = data.order;
            }
        }
    };

    const createPeer = (initiator = false) => {
        // when initiator is true, this client is making an offer.
        let peer = new SimplePeer({ initiator, trickle: false });

        peer.on('error', (err) => {
            log('error', err);
        });

        peer.on('connect', () => {
            peer.reallyIsConnected = true;
            log('CONNECTED TO PEER', peer.id);
            peers.set(peer.id, peer);

            if (isLeader) {
                introducePeerToOthers(peer);
                peerConnectionOrderList.push(peer.id);
                sendConnectionOrderList();
            } else if (!leaderPeer) {
                leaderPeer = peer;
            }
            onConnected(peer);
        });

        peer.on('data', (data) => {
            let json = {};
            try {
                json = JSON.parse(data);
            } catch (e) {}

            log('got message: ', json);

            const command = peerCommands[json.cmd];
            if (command) {
                command(peer, json);
            }

            const userCommands = opts.commands;
            if (userCommands) {
                const command = userCommands[json.cmd];
                if (command) {
                    command(peer, json);
                }
            }
        });

        peer.on('close', () => {
            peers.delete(peer.id);
            if (peer.reallyIsConnected) {
                const targetIdx = peerConnectionOrderList.indexOf(peer.id);
                if (targetIdx > -1) {
                    peerConnectionOrderList.splice(targetIdx, 1);
                }
                if (isLeader && !isDisconnecting) {
                    sendConnectionOrderList();
                }
                if (!isLeader && peer === leaderPeer) { // leader disconnected
                    const nextLeaderId = peerConnectionOrderList[0];
                    peerConnectionOrderList.shift();
                    if (nextLeaderId !== myId) {
                        leaderPeer = peers.get(nextLeaderId);
                    } else {
                        // we are the new leader.
                        makeLeader();
                        window.wsSignaling.init(opts.signalingServer, privatePeerMeshApi, joinedRoom, true).then(() => {
                            sendConnectionOrderList();
                        });
                    }
                }
                log('LOST CONNECTION TO PEER:', peer.id);
                onDisconnected(peer);
            }
        });

        return peer;
    };

    const disconnect = () => {
        isDisconnecting = true;
        peers.forEach((peer) => {
            peer.destroy();
        });
        peers.clear();
    };

    const makeLeader = (val = true) => {
        isLeader = val;
    };

    const broadcastCommand = (command, data) => {
        const packagedData = JSON.stringify({
            cmd: command,
            data
        });
        peers.forEach(peer => {
            peer.send(packagedData);
        });
    };

    const privatePeerMeshApi = {
        createPeer,
        disconnect,
        peers,
        makeLeader,
        get myId() {
            return myId;
        },
        set myId(id) {
            myId = id;
        }
    };

    const joinRoom = room => {
        isDisconnecting = false;
        return window.wsSignaling.init(opts.signalingServer, privatePeerMeshApi, room).then(() => {
            joinedRoom = room;
        });
    };

    window.addEventListener('beforeunload', disconnect);

    return {
        joinRoom,
        disconnect,
        peers,
        broadcastCommand,
        get myId() {
            return myId;
        }
    };
}

{
    const HOST = 'wss://peer-signaling.herokuapp.com';
    // const HOST = 'ws://localhost:3000';

    const chat = document.querySelector('#chat');
    const addMessage = (msg, style) => {
        const newMsg = document.createElement('div');
        newMsg.setAttribute('style', style || '');
        newMsg.textContent = msg;
        chat.appendChild(newMsg);
        chat.scrollTop = 999999;
    };

    let myName;

    const meshOptions = {
        signalingServer: HOST,
        commands: {
            text(peer, data) {
                addMessage(`${peer.name}: ${data.data}`);
            },
            intro(peer, data) {
                peer.name = data.name;
                addMessage(`Connected to ${peer.name}!`, 'font-weight: bold;');
            }
        },
        onConnected: (peer) => {
            // addMessage(`Connected to peer ${peer.id}!`, 'font-weight: bold;');
            peer.send(JSON.stringify({
                cmd: 'intro',
                name: myName
            }));
        },
        onDisconnected: (peer) => {
            addMessage(`Lost connection to peer ${peer.name}!`, 'font-weight: bold;');
        },
        debug: true
    };
    window.meshOptions = meshOptions;

    const peerMesh = window.createPeerMesh(meshOptions);

    const chatInput = document.querySelector('#chatInput');
    const send = () => {
        peerMesh.broadcastCommand('text', chatInput.value);
        addMessage('You: ' + chatInput.value);
        chatInput.value = '';
    };

    chatInput.addEventListener('keydown', (e) => {
        if (e.keyCode === 13) {
            send();
        }
    });

    document.querySelector('#sendBtn').addEventListener('click', send);

    const connectForm = document.querySelector('#connectForm');
    const chatBox = document.querySelector('#chatBox');
    const roomInput = document.querySelector('#roomInput');
    const nameInput = document.querySelector('#nameInput');
    const joinBtn = document.querySelector('#joinBtn');

    joinBtn.addEventListener('click', () => {
        const targetRoom = roomInput.value || 'default';
        myName = nameInput.value || 'anon';
        peerMesh.joinRoom(targetRoom).then(() => {
            chatBox.style.display = 'block';
            connectForm.style.display = 'none';
            addMessage('Connected to room: ' + targetRoom, 'font-weight: bold;');
        }).catch(() => {
            alert('Failed to connect!');
        });
    });
    window.peerMesh = peerMesh;
}

import ui from "./ui.js";
import * as p2p from "./p2p.js";

const { paper } = window;

let numPeers = 0;
const peers = {};

const LERP_INTERVAL = 200;

const lerp = (a, b, t) => a + (b - a) * Math.min(t, 1);

const init = () => {
    const myColor = `hsl(${Math.random() * 360}, 100%, 50%)`;

    ui.peerCountIcon.style.backgroundColor = myColor;

    let mousePos = {};
    paper.view.on("mousemove", (e) => {
        mousePos.x = e.point.x;
        mousePos.y = e.point.y;
    });

    setInterval(() => {
        if (mousePos) {
            p2p.sendCommand("p", mousePos);
        }
    }, LERP_INTERVAL);

    p2p.registerCommand("p", (msg, address) => {
        const peer = peers[address];
        if (peer) {
            peer.lastUpdate = Date.now();
            peer.lastPoint = peer.nextPoint;
            peer.nextPoint = paper.view.projectToView(msg);
        }
    });

    p2p.registerCommand("peerColor", (msg, address) => {
        const peer = peers[address];
        if (peer) {
            peer.el.style.backgroundColor = msg.color;
        }
    });

    p2p.on("seen", (address) => {
        const newPeerEl = document.createElement("div");
        newPeerEl.classList.add("peer");
        document.body.appendChild(newPeerEl);
        peers[address] = {
            el: newPeerEl,
            lastUpdate: Date.now(),
            nextPoint: {x: -100, y: 0},
            lastPoint: {x: -100, y: 0},
        };

        p2p.sendCommand("peerColor", address, { color: myColor });
    });

    p2p.on("left", (address) => {
        const peer = peers[address];
        if (peer) {
            document.body.removeChild(peer.el);
            delete peers[address];
        }
    });

    p2p.on("connections", (num) => {
        numPeers = num;
        ui.peerCountValue.textContent = num + 1;
    });

    const updatePeers = () => {
        requestAnimationFrame(updatePeers);
        const peerKeys = Object.keys(peers);
        peerKeys.forEach((address) => {
            const peer = peers[address];
            const now = Date.now();
            const dt = now - peer.lastUpdate;
            if (dt > 5000) {
                if (numPeers !== peerKeys.length) {
                    document.body.removeChild(peer.el);
                    delete peers[address];
                }
            }

            const lerpX = lerp(peer.lastPoint.x, peer.nextPoint.x, dt / LERP_INTERVAL);
            const lerpY = lerp(peer.lastPoint.y, peer.nextPoint.y, dt / LERP_INTERVAL);
            peer.el.style.left = ui.canvas.offsetLeft + lerpX + "px";
            peer.el.style.top = ui.canvas.offsetTop + lerpY + "px";
        });
    };

    requestAnimationFrame(updatePeers);
};

export default init;

const eventHandlers = {};

export const on = (event, handler) => {
    if (!eventHandlers[event]) {
        eventHandlers[event] = [];
    }
    eventHandlers[event].push(handler);
};

export const off = (event, handler) => {
    const handlers = eventHandlers[event];
    if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx !== -1) {
            handlers.splice(idx, 1);
        }
    }
};

export const trigger = (event, ...args) => {
    const handlers = eventHandlers[event];
    if (handlers) {
        handlers.forEach(handler => handler(...args));
    }
};

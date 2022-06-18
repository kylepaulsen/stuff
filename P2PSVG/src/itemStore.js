const { uuidv4 } = window;

const itemStore = {};

export const setItem = (id, item) => {
    itemStore[id] = item;
    return item;
};

export const storeItem = (item) => {
    if (!item.uuid) {
        item.uuid = uuidv4();
    }
    return setItem(item.uuid, item);
};

export const getItem = (uuid) => {
    return itemStore[uuid];
};

export const removeItem = (item) => {
    delete itemStore[item.uuid || item];
};

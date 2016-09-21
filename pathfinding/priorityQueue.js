// This function assumes that nodes have an id
function priorityQueue(compare) {
    "use strict";
    compare = compare || function(a, b) { return a > b; };
    var tree = [];
    var hasMap = {};

    var getChild = function(parentNodeIdx, getRight) {
        var idx;
        if (getRight) {
            idx = 2 * parentNodeIdx + 2;
        } else {
            idx = 2 * parentNodeIdx + 1;
        }
        return {idx: idx, val: tree[idx]};
    };

    var getParent = function(nodeIdx) {
        // safe if you have less than 2,147,483,647 elements.
        var idx = (nodeIdx - 1) >> 1;
        // var idx = Math.floor((parentNodeIdx - 1) / 2);
        return {idx: idx, val: tree[idx]};
    };

    var swap = function(idx1, idx2) {
        var temp = tree[idx1];
        var node2 = tree[idx2];
        hasMap[temp.id] = idx2;
        hasMap[node2.id] = idx1;
        tree[idx1] = node2;
        tree[idx2] = temp;
    };

    var heapDown = function(currentIdx) {
        var val = tree[currentIdx];
        var leftChild = getChild(currentIdx, false);
        var rightChild = getChild(currentIdx, true);
        var childToSwap;
        while ((leftChild.val && compare(val, leftChild.val)) || (rightChild.val && compare(val, rightChild.val))) {
            if (leftChild.val && rightChild.val) {
                if (compare(leftChild.val, rightChild.val)) {
                    childToSwap = rightChild;
                } else {
                    childToSwap = leftChild;
                }
            } else if (leftChild.val) {
                childToSwap = leftChild;
            } else {
                childToSwap = rightChild;
            }
            swap(currentIdx, childToSwap.idx);
            currentIdx = childToSwap.idx;
            leftChild = getChild(currentIdx, false);
            rightChild = getChild(currentIdx, true);
        }
    };

    var heapUp = function(currentIdx) {
        var val = tree[currentIdx];
        var parent = getParent(currentIdx);
        while (parent.idx > -1 && compare(parent.val, val)) {
            swap(parent.idx, currentIdx);
            currentIdx = parent.idx;
            parent = getParent(currentIdx);
        }
        return currentIdx;
    };

    var add = function(val) {
        var currentIdx = tree.length;
        tree.push(val);
        currentIdx = heapUp(currentIdx);
        hasMap[val.id] = currentIdx;
    };

    var pop = function() {
        var root = tree[0];
        if (root) {
            delete hasMap[root.id];

            var val = tree.pop();
            if (tree.length > 0) {
                tree[0] = val;
                hasMap[val.id] = 0;
            }

            heapDown(0);
            return root;
        }
    };

    var update = function(val) {
        var currentIdx = hasMap[val.id];
        heapUp(currentIdx);
        heapDown(currentIdx);
    };

    var peek = function() {
        return tree[0];
    };

    var has = function(val) {
        return hasMap[val.id] !== undefined;
    };

    var clear = function() {
        tree = [];
    };

    var size = function() {
        return tree.length;
    };

    return {
        add: add,
        pop: pop,
        update: update,
        peek: peek,
        has: has,
        clear: clear,
        size: size
    };
}

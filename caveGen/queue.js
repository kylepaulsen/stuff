function queue() {
    var head;
    var tail;

    function node(obj) {
        return {
            val: obj,
            next: undefined
        };
    }

    function push(obj) {
        var newNode = node(obj);
        if (pub.length > 0) {
            tail.next = newNode;
            tail = newNode;
        } else {
            head = newNode;
            tail = newNode;
        }
        pub.length++;
    }

    function pop() {
        if (pub.length > 0) {
            var val = head.val;
            if (head.next) {
                head = head.next;
            }
            pub.length--;
            return val;
        }
    }

    function peek() {
        if (head) {
            return head.val;
        }
    }

    function getList() {
        var list = [];
        var n = head;
        while (n) {
            list.push(n.val);
            n = n.next;
        }
        return list;
    }

    var pub = {
        push: push,
        pop: pop,
        peek: peek,
        getList: getList,
        length: 0
    };

    return pub;
}

function queue2() {
    this.head = undefined;
    this.tail = undefined;
    this.length = 0;
}
queue2.prototype.node = function(obj) {
    return {
        val: obj,
        next: undefined
    };
};
queue2.prototype.push = function(obj) {
    var newNode = this.node(obj);
    if (this.length > 0) {
        this.tail.next = newNode;
        this.tail = newNode;
    } else {
        this.head = newNode;
        this.tail = newNode;
    }
    this.length++;
};
queue2.prototype.pop = function() {
    if (this.length > 0) {
        var val = this.head.val;
        if (this.head.next) {
            this.head = this.head.next;
        }
        this.length--;
        return val;
    }
};
queue2.prototype.peek = function() {
    if (this.head) {
        return this.head.val;
    }
};
queue2.prototype.getLength = function() {
    return this.length;
};

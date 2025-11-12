const {
    AddressSLL
} = require("./address");

class Queue {
    constructor() {
        this.head = null;
        this.tail = null;
    }

    deQueue() {
        let p = this.head;
        if(this.head == this.tail) {
            this.head = null;
            this.tail = null;
        }
        else {
            this.head = this.head.next;
            p.next = null;
        }
        return p;
    }

    enQueue(x) {
        let p = new AddressSLL(x);
        if(!this.head && !this.tail) {
            this.head = p;
            this.tail = p;
        }
        else {
            this.tail.next = p;
            this.tail = p;
        }
    }

    isEmpty() {
        return this.head != null && this.tail != null;
    }
}

module.exports = Queue;
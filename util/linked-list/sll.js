const {
    AddressSLL
} = require("./address");

class SLL {
    constructor() {
        this.first = null;
        this.last = null;
        this.length = 0;
    }

    deleteFirst() {
        let p = this.first;
        if(!this.isEmpty()) {
            if(this.first === this.last) {
                this.first = null;
                this.last = null;
            }
            else {
                this.first = this.first.next;
                p.next = null;
            }
            this.length--;
        }
        return p ? p.info : null;
    }

    deleteLast() {
        let q, p;
        if(!this.isEmpty()) {
            p = this.first;
            if(this.first === this.last) {
                this.first = null;
                this.last = null;
            }
            else {
                while(p.next != null) {
                    q = p;
                    p = p.next;
                }
                q.next = null;
                this.last = q;
            }
        }
        return p ? p.info : null;
    }

    getFirst() {
        return this.last ? this.last.info : null;
    }

    getLast() {
        return this.last ? this.last.info : null;
    }

    isEmpty() {
        return this.first === null;
    }

    insertFirst(x) {
        let p = new AddressSLL(x);
        if(this.isEmpty()) {
            this.first = p;
            this.last = p;
        }
        else {
            p.next = this.first;
            this.first = p;
        }
        this.length++;
    }

    insertLast(x) {
        let p, q;
        p = new AddressSLL(x);
        if(this.isEmpty()) {
            this.first = p;
            this.last = p;
        }
        else {
            q = this.first;
            while(q.next != null) {
                q = q.next;
            }
            q.next = p;
            this.last = q.next;
        }
        this.length++;
    }
}

module.exports = SLL;
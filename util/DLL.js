const {
    AddressDLL
} = require("./address");

class DLL {
    constructor() {
        this.first = null;
        this.last = null;
        this.length = 0;
    }

    getLast() {
        return this.last ? this.last.info : null;
    }

    getFirst() {
        return this.first ? this.first.info : null;
    }

    deleteFirst() {
        let p = this.first;
        if(!this.isEmpty()) {
            if(this.first === this.last) {
                this.last = null;
                this.first = null;
            }
            else {
                this.first = this.first.next;
                this.first.prev = null;
                p.next = null;
            }
            this.length--;
        }
        return p ? p.info : null;
    }

    deleteLast() {
        let p = this.first;
        if(!this.isEmpty()) {
            if(this.first === this.last) {
                this.last = null;
                this.first = null;
            }
            else {
                this.last = this.last.prev;
                this.last.next = null;
                p.next = null;
            }
            this.length--;
        }
        return p ? p.info : null;
    }

    /**
     * 
     * @param {number} index 
     */
    deleteByIndex(index) {
        let p;
        let i = 0;

        p = this.first;
        while(p != null && i != index) {
            p = p.next;
            i++;
        }

        if(p) {
            if(p.prev) p.prev.next = p.next;
            else this.first = p.next;

            if(p.next) p.next.prev = p.prev;
            else this.last = p.prev;

            p.next = null;
            p.prev = null;
        }
        return p ? p.info : null;
    }

    isEmpty() {
        return this.first === null;
    }

    insertLast(info) {
        let p = new AddressDLL(info);
        if(this.isEmpty()) {
            this.first = p;
            this.last = p;
        }
        else {
            p.prev = this.last;
            this.last.next = p;
            this.last = p;
        }
        this.length++;
    }

    insertFirst(x) {
        let p = new AddressDLL(x);
        if(this.isEmpty()) {
            this.first = p;
            this.last = p;
        }
        else {
            p.next = this.first;
            this.first.prev = p;
            this.first = p;
        }
        this.length++;
    }

    /**
     * 
     * @param {[]} array 
     */
    insertMultipleFirst(array) {
        for (let i = 0; i < array.length; i++) {
            this.insertFirst(array[i]);
        }
    }

    /**
     * 
     * @param {[]} array 
     */
    insertMultipleLast(array) {
        for (let i = 0; i < array.length; i++) {
            this.insertLast(array[i]);
        }
    }

    toArray() {
        let p = this.first;
        let array = [];
        while(p != null) {
            array.push(p.info);
            p = p.next;
        }
        return array;
    }
}

module.exports = DLL;
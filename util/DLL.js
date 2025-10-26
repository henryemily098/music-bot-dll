class Address {
    constructor(x) {
        this.info = x;
        this.next = null;
        this.prev = null;
    }
}

class DLL {
    constructor() {
        this.first = null;
        this.last = null;
        this.length = 0;
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

    insert(info) {
        let p = new Address(info);
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

    /**
     * 
     * @param {[]} array 
     */
    insertMultiple(array) {
        for (let i = 0; i < array.length; i++) {
            this.insert(array[i]);
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
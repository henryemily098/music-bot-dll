class Stack {
    /**
     * 
     * @param {number} MAXVALUE 
     */
    constructor(MAXVALUE) {
        this.info = [];
        this.top = -1;
        this.length = 0;
        this.maxValue = MAXVALUE;
    }

    deleteLast() {
        let p = null;
        if(this.isEmpty()) {
            p = this.info.splice(this.top, 1)[0];
            this.length--;
            this.top--;
        }
        return p;
    }

    insertFirst(x) {
        if(this.isFull()) {
            this.top++;
            this.length++;
            this.info[this.top] = x;
        }
    }

    isFull() {
        return this.length == this.maxValue;
    }

    isEmpty() {
        return this.top == -1;
    }
}

module.exports = Stack;
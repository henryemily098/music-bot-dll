class AddressDLL {
    constructor(x) {
        this.info = x;
        this.next = null;
        this.prev = null;
    }
}

class AddressSLL {
    constructor(x) {
        this.info = x;
        this.next = null;
    }
}

module.exports = {
    AddressDLL,
    AddressSLL
}
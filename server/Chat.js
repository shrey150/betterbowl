const Filter = require("bad-words");

class Chat {

    constructor(io) {
        this.io = io;
        this.filter = new Filter();
    }

    parse(msg, name) {
        const censored = this.filter.clean(msg);
        const formatted = `<b>${name}</b> ${censored}`;

        return formatted;
    }

    clean(msg) { console.log(msg); return this.filter.clean(msg); } 

}

module.exports = Chat;
class Timer {

    constructor(io, callback) {
        this.io = io;
        this.callback = callback;
    }

    clearTimer() {
        clearInterval(this.ticker);
        clearTimeout(this.timeout);
    }

    countdown(n) {

        this.timer = n;
        this.tick();
        this.ticker = setInterval(() => this.tick(), 100);
        this.timeout = setTimeout(() => clearInterval(this.ticker), n*1000+200);
        this.callbackTimer = setTimeout(this.callback, n*1000+200);
    }

    tick() {
        console.log(this.timer);
        this.io.emit("tick", this.timer);
        this.timer -= 0.1;
    }

}

module.exports = Timer;
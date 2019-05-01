class Timer {

    constructor(io) { this.io = io; }

    clearTimer() {
        clearInterval(this.ticker);
        clearTimeout(this.timeout);
    }

    countdown(n) {
        this.timer = n;
        this.tick();
        this.ticker = setInterval(() => this.tick(), 100);
        this.timeout = setTimeout(() => clearInterval(this.ticker), 7001);
    }

    tick() {
        this.io.emit("tick", this.timer);
        this.timer -= 0.1;
    }

}

module.exports = Timer;
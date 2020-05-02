class Timer {

    constructor(io, callback, type) {
        this.io = io;
        this.callback = callback;
        this.type = type;
    }

    clearTimer() {
        clearInterval(this.ticker);
    }

    resume() {
        this.countdown(this.timer);
    }

    countdown(n) {
        this.timer = n;
        this.tick();
        this.ticker = setInterval(() => this.tick(), 100);
    }

    tick() {

        // if timer is not over (more than 0 seconds left),
        // subtract 0.1 seconds and update clients
        if (this.timer > 0.00001) {
            this.io.emit("tick", {
                time: this.timer,
                type: this.type
            });
            this.timer -= 0.1;
        }
        // otherwise, clear the timer
        else {
            this.clearTimer();
            this.callback();
        }
    }

}

module.exports = Timer;
const Timer = require("./Timer");

class Question {

    constructor(question, answer, info, speed, io) {

        this.endTimer = new Timer(io, () => this.revealAnswer(), "dead");

        this.update = this.update.bind(this);
        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);

        this.question = question;
        this.answer = answer;
        this.info = info;
        this.speed = speed;
        this.arr = question.split(" ");
        this.io = io;
        this.index = 0;
        this.reading = false;
        this.finished = false;
        this.answered = false;

        this.start();
    }

    start() {
        if (this.index < this.arr.length) {
            this.buzzTimer = setInterval(() => this.read(), this.speed);
            this.reading = true;
        }
    }

    read() {
        this.io.emit("questionUpdate", this.arr[this.index] + " ");
        this.index++;
        if (this.index === this.arr.length) this.finishQuestion();
    }

    update(id) {
        const previousWords = this.arr.slice(0, this.index);
        this.io.to(id).emit("questionUpdate", previousWords.join(" ") + " ");
    }

    finishQuestion() {
        const remainingWords = this.arr.slice(this.index);
        this.io.emit("questionUpdate", remainingWords.join(" "));
        this.index = this.arr.length;
        this.stop();
        this.finished = true;

        if (!this.answered) {
            this.endTimer.countdown(7);
            this.io.emit("deadTimer");
        }
    }

    stop() {
        clearInterval(this.buzzTimer);
        this.reading = false;
    }

    revealAnswer() {

        this.answered = true;

        this.io.emit("revealAnswer", {
            answer: this.answer,
            info:   this.info
        });

        this.io.emit("clearBuzz");
    }

}

module.exports = Question;
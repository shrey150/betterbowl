class Question {

    constructor(question, answer, speed, io) {

        this.read = this.read.bind(this);
        this.update = this.update.bind(this);
        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);

        this.question = question;
        this.answer = answer;
        this.speed = speed;
        this.timer = setInterval(this.read, this.speed);
        this.arr = question.split(" ");
        this.io = io;
        this.index = 0;
        this.reading = false;

    }

    start() {
        if (this.index < this.arr.length) {
            this.timer = setInterval(this.read, this.speed);
            this.reading = true;
        }
    }

    read() {
        this.io.emit("questionUpdate", this.arr[this.index] + " ");
        this.index++;
        if (this.index === this.arr.length) this.stop();
    }

    update(id) {
        const previousWords = this.arr.slice(0, this.index);
        this.io.to(id).emit("questionUpdate", previousWords.join(" ") + " ");
    }

    stop() {
        clearInterval(this.timer);
        this.reading = false;
    }

}

module.exports = Question;
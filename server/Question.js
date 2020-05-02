const Timer = require("./Timer");

class Question {

    constructor(question, answer, info, speed, io) {

        // end-of-question timer: when over, question is "dead"
        this.endTimer = new Timer(io, () => this.revealAnswer(), "dead");

        this.update = this.update.bind(this);
        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);

        this.question = question;
        this.answer = answer;
        this.info = info;
        this.speed = speed;
        this.io = io;

        // create array of words of question
        this.arr = question.split(" ");

        // current word of question
        this.index = 0;

        // location of power marker
        this.powerIndex = this.arr.findIndex(n => n.includes("(*)"));

        // Reading: question reading is in progress
        // Finished: question has finished being read, players may still buzz
        // Answered: question has been answered by a player
        this.reading = false;
        this.finished = false;
        this.answered = false;

        // start reading question
        this.start();
    }

    start() {
        // if question has not reached the end,
        // read one word every x seconds
        if (this.index <= this.arr.length) {
            this.buzzTimer = setInterval(() => this.read(), this.speed);
            this.reading = true;
        }
    }

    read() {

        // read the next word of the question
        this.io.emit("questionUpdate", this.arr[this.index] + " ");
        this.index++;

        // if question has reached the end
        if (this.index === this.arr.length) {

            // switch question to "end-of-question" timer
            this.finishQuestion();
            this.endTimer.countdown(7);
            this.io.emit("deadTimer");

        }
    }

    // send all previously read words of question to newly joined player
    update(id) {
        const previousWords = this.arr.slice(0, this.index);
        this.io.to(id).emit("questionUpdate", previousWords.join(" ") + " ");
    }

    finishQuestion() {
        
        // jump to the end of the question and stop reading
        const remainingWords = this.arr.slice(this.index);
        this.io.emit("questionUpdate", remainingWords.join(" "));
        this.index = this.arr.length;
        this.stop();
        this.finished = true;
    }

    stop() {
        clearInterval(this.buzzTimer);
        this.reading = false;
    }

    revealAnswer() {

        if (!this.answered) {

            this.io.emit("revealAnswer", {
                answer: this.answer,
                info:   this.info
            });

            this.answered = true;
        }

        this.io.emit("clearBuzz");
    }

}

module.exports = Question;
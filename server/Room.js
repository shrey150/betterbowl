const Question = require("./Question");
const QuestionBank = require("./QuestionBank");
const Checker = require("./Checker");

class Room {

    constructor(name, io) {

        this.changeScore = this.changeScore.bind(this);

        this.name = name;
        this.players = [];
        this.scores = [];
        this.question = null;

        // index of "this.players"
        this.buzzed = -1;

        this.io = io.of("/" + name);
        this.listen();

        this.fetchQuestionBank();

        this.logHistory = [];
        this.checker = new Checker();

    }

    listen() {

        this.io.on("connection", socket => {

            this.players.push(socket.id);
            this.scores.push({ name: socket.id, score: 0 });

            // update previous log messages
            this.io.to(socket.id).emit("updateLogHistory", this.logHistory);

            this.log(`${socket.id} connected (total players ${this.scores.length})`);

            // update players who joined in the middle of a question
            if (this.question) this.question.update(socket.id);

            // update buzzer status
            if (this.buzzed !== -1)
                this.io.to(socket.id).emit("playerBuzzed", this.players[this.buzzed]);

            socket.on("nextQuestion", () => {
                if (this.buzzed === -1)
                    this.fetchQuestion();
            })

            socket.on("buzz", data => {

                console.log(`Received buzz from ${socket.id}`);

                if (this.buzzed === -1) {

                    if (this.question) this.question.stop();

                    this.buzzed = this.players.indexOf(socket.id);
                    this.io.emit("playerBuzzed", this.players[this.buzzed]);

                    this.io.to(socket.id).emit("requestAnswer");

                    this.buzzTimer = setInterval(() => this.clearBuzz(), 5000);

                }
                else {
                    console.log(`Invalid buzz from ${socket.id}!`);
                    this.io.to(socket.id).emit("buzzFailed");
                }
            });

            socket.on("sendAnswer", data => {

                console.log("Received answer: " + data);

                if (socket.id === this.players[this.buzzed] && this.question) {

                    if (this.checker.smartCheck(data, this.question.answer) > 0) {

                        const score = this.changeScore(socket.id, 10);
                        this.log(`${socket.id} buzzed correctly! (score ${score})`);
                        this.question.finishQuestion();
                        this.question.answered = true;

                    } else {

                        this.io.emit("answerResponse", false);
                        
                        if (!this.question.finished) {

                            const score = this.changeScore(socket.id, -5);
                            this.log(`${socket.id} negged (score ${score})`);
                        
                        } else this.log(`${socket.id} buzzed incorrectly, no penalty.`);

                    }

                    this.clearBuzz();

                }

            });

            socket.on("disconnect", data => {

                // remove player from array
                this.players = this.players.filter(x => x !== socket.id);
                this.scores = this.scores.filter(x => x.name !== socket.id);
                this.log(`${socket.id} disconnected (total players ${this.players.length})`);

            });
            
            socket.on("clearBuzz", () => this.clearBuzz());
            socket.on("chat", data => {});

        });

    }

    getScore(user) {
        const player = this.scores.filter(x => x.name === user);
        return player.score;
    }

    changeScore(user, num) {

        let score = 0;

        this.scores.forEach(n => {
            if (n.name === user) {
                n.score += num;
                score = n.score;
            }
        });

        return score;
    }

    clearBuzz() {

        clearInterval(this.buzzTimer);

        if (this.buzzed !== -1) {

            if (this.question) {
                if (!this.question.reading && !this.question.finished) {
                    this.question.start();
                }
            }

            this.buzzed = -1;
            this.io.emit("clearBuzz");

            console.log("Clearing buzz...");

        }

    }

    fetchQuestionBank() {

        this.qb = new QuestionBank({

            "query"			: "",
            "search_type"	: "",
            "difficulty"	: "middle_school",
            "question_type"	: "Tossup",
            "limit"			: "true",
            "download"		: "json"

        });

        this.qb.search().then(() => console.log("Questions loaded!"));

    }

    fetchQuestion() {
     
        if (this.question) this.question.stop();
        this.buzzed = -1;

        this.io.emit("clearQuestion");

        const q = this.qb.fetchQuestion();

        console.log(q);

        this.question = new Question(q.text, q.answer, 100, this.io);
    }

    log(msg) {

        console.log(msg);
        this.io.emit("log", msg + "\n");
        this.logHistory.unshift(msg);

    }

}

module.exports = Room;
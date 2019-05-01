const Question = require("./Question");
const QuestionBank = require("./QuestionBank");
const Checker = require("./Checker");
const Users = require("./Users");
const Timer = require("./Timer");

class Room {

    constructor(name, io) {

        this.name = name;
        this.players = [];
        this.question = null;

        // index of "this.players"
        this.buzzed = -1;
        this.prompted = false;

        this.io = io.of("/" + name);
        this.listen();

        this.fetchQuestionBank();

        this.logHistory = [];
        this.checker = new Checker();
        this.users = new Users(this.io);
        this.timer = new Timer(this.io);

        this.timerCount = 7;

    }

    listen() {

        this.io.on("connection", socket => {

            const name = socket.handshake.query.name;

            // get IP, whether running locally or on Heroku
            const ip =  socket.handshake.headers["x-forwarded-for"] ||
                        socket.handshake.address;

            this.users.addUser(name, socket.id, ip);

            // update previous log messages
            this.io.to(socket.id).emit("updateLogHistory", this.logHistory);

            this.log(`${this.users.getName(socket.id)} connected (total players ${this.users.players.length})`);

            // update players who joined in the middle of a question
            if (this.question) this.question.update(socket.id);

            // update buzzer status
            if (this.buzzed !== -1)
                this.io.to(socket.id).emit("playerBuzzed", this.users.getUserByIndex(this.buzzed));

            socket.on("nextQuestion", () => {
                if (this.buzzed === -1)
                    this.fetchQuestion();
            })

            socket.on("buzz", data => {

                console.log(`Received buzz from ${this.users.getName(socket.id)}`);

                if (this.buzzed === -1) {

                    if (this.question) this.question.stop();

                    this.buzzed = this.users.getIndex(this.users.getUser(socket.id));
                    this.io.emit("playerBuzzed", this.users.getName(socket.id));

                    this.io.to(socket.id).emit("requestAnswer");

                    this.timer.countdown(this.timerCount);
                    this.buzzTimer = setTimeout(() => this.clearBuzz(), 7200);

                }
                else {
                    console.log(`Invalid buzz from ${this.users.getName(socket.id)}!`);
                    this.io.to(socket.id).emit("buzzFailed");
                }
            });

            socket.on("sendAnswer", data => {

                console.log("Received answer: " + data);

                if (socket.id === this.users.getUserByIndex(this.buzzed).id && this.question) {

                    const verdict = this.checker.smartCheck(data, this.question.answer);

                    if (verdict === 2) {

                        const score = this.users.changeScore(socket.id, 10);
                        this.log(`${this.users.getName(socket.id)} buzzed correctly! (score ${score})`);
                        this.question.finishQuestion();
                        this.question.answered = true;

                    } else if (verdict === 1 && !this.prompted) {

                        this.log(`[TODO] Prompt...`);
                        this.io.to(socket.id).emit("requestAnswer");

                        this.prompted = true;

                        clearInterval(this.buzzTimer);
                        this.buzzTimer = setInterval(() => this.clearBuzz(), this.timerCount + 200);

                    } else {

                        this.io.emit("answerResponse", false);
                        
                        if (!this.question.finished) {

                            const score = this.users.changeScore(socket.id, -5);
                            this.log(`${this.users.getName(socket.id)} negged (score ${score})`);
                        
                        } else this.log(`${this.users.getName(socket.id)} buzzed incorrectly, no penalty.`);

                    }

                    this.timer.clearTimer();
                    this.clearBuzz();

                }

            });

            socket.on("disconnect", data => {
                const name = this.users.getName(socket.id);
                this.users.disconnect(socket.id);
                this.log(`${name} disconnected (total players ${this.players.length})`);
            });
            
            socket.on("clearBuzz", () => this.clearBuzz());
            socket.on("chat", data => {});

        });

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

        this.question = new Question(q.text, q.formatted_answer, 100, this.io);
    }

    log(msg) {

        console.log(msg);
        this.io.emit("log", msg + "\n");
        this.logHistory.unshift(msg);

    }

}

module.exports = Room;
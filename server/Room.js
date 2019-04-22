const Question = require("./Question");
const QuestionBank = require("./QuestionBank");

class Room {

    constructor(name, io) {

        this.name = name;
        this.players = [];
        this.question = null;

        // index of "this.players"
        this.buzzed = -1;

        this.io = io.of("/" + name);
        this.listen();

        this.fetchQuestionBank();
    }

    listen() {

        this.io.on("connection", socket => {

            this.players.push(socket.id);

            console.log(`${socket.id} connected (total ${this.players.length})`);

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

                if (socket.id === this.players[this.buzzed]) {

                    if (data === this.question.answer) {
                        this.io.emit("answerResponse", true);
                        console.log("Correct answer!");
                    }
                    else {
                        this.io.emit("answerResponse", false);
                        console.log("Incorrect answer.");
                    }

                    this.clearBuzz();

                }

            });

            socket.on("disconnect", data => {

                // remove player from array
                this.players = this.players.filter(x => x !== socket.id);
                console.log(`${socket.id} disconnected (total ${this.players.length})`);

            });
            
            socket.on("clearBuzz", () => this.clearBuzz());
            socket.on("chat", data => {});

        });

    }

    clearBuzz() {

        clearInterval(this.buzzTimer);

        if (this.buzzed !== -1) {

            if (this.question) {
                if (!this.question.reading) {
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

}

module.exports = Room;
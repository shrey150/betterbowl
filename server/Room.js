const Question = require("./Question");
const QuestionBank = require("./QuestionBank");
const Checker = require("./Checker");

const Namer = require("./Namer");

class Room {

    constructor(name, io) {

        this.changeScore = this.changeScore.bind(this);

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
        this.namer = new Namer();

    }

    listen() {

        this.io.on("connection", socket => {

            const name = socket.handshake.query.name;
            const ip = socket.handshake.address;

            this.addUser(name, socket.id, ip);

            // update previous log messages
            this.io.to(socket.id).emit("updateLogHistory", this.logHistory);

            this.log(`${this.getName(socket.id)} connected (total players ${this.players.length})`);

            // update players who joined in the middle of a question
            if (this.question) this.question.update(socket.id);

            // update buzzer status
            if (this.buzzed !== -1)
                this.io.to(socket.id).emit("playerBuzzed", this.players[this.buzzed].name);

            socket.on("nextQuestion", () => {
                if (this.buzzed === -1)
                    this.fetchQuestion();
            })

            socket.on("buzz", data => {

                console.log(`Received buzz from ${this.getName(socket.id)}`);

                if (this.buzzed === -1) {

                    if (this.question) this.question.stop();

                    this.buzzed = this.players.indexOf(this.getUser(socket.id));
                    this.io.emit("playerBuzzed", this.getName(socket.id));

                    this.io.to(socket.id).emit("requestAnswer");

                    this.buzzTimer = setInterval(() => this.clearBuzz(), 7200);

                }
                else {
                    console.log(`Invalid buzz from ${this.getName(socket.id)}!`);
                    this.io.to(socket.id).emit("buzzFailed");
                }
            });

            socket.on("sendAnswer", data => {

                console.log("Received answer: " + data);

                if (socket.id === this.players[this.buzzed].id && this.question) {

                    const verdict = this.checker.smartCheck(data, this.question.answer);

                    if (verdict === 2) {

                        const score = this.changeScore(socket.id, 10);
                        this.log(`${this.getName(socket.id)} buzzed correctly! (score ${score})`);
                        this.question.finishQuestion();
                        this.question.answered = true;

                    } else if (verdict === 1 && !this.prompted) {

                        this.log(`[TODO] Prompt...`);
                        this.io.to(socket.name).emit("requestAnswer");

                        clearInterval(this.buzzTimer);
                        this.buzzTimer = setInterval(() => this.clearBuzz, 7200);

                    } else {

                        this.io.emit("answerResponse", false);
                        
                        if (!this.question.finished) {

                            const score = this.changeScore(socket.id, -5);
                            this.log(`${this.getName(socket.id)} negged (score ${score})`);
                        
                        } else this.log(`${this.getName(socket.id)} buzzed incorrectly, no penalty.`);

                    }

                    this.clearBuzz();

                }

            });

            socket.on("disconnect", data => {

                const name = this.getName(socket.id);

                this.players.forEach(n => {
                    if (n.id === socket.id)
                        n.connected = false;
                });

                this.players = this.players.filter(x => x.id !== socket.id || x.ip !== "guest");
                this.log(`${name} disconnected (total players ${this.players.length})`);

                this.sendScoreboard();

            });
            
            socket.on("clearBuzz", () => this.clearBuzz());
            socket.on("chat", data => {});

        });

    }

    addUser(name=this.namer.random(), id, ip) {

        let merged = false;

        this.players.forEach(n => {
            
            if (n.ip === ip) {

                if (!n.connected) {
                    n.id = id;
                    n.connected = true;
                    merged = true;
                }
                else {
                    name = "Doppelganger" + new Date().getMilliseconds();
                    ip = "guest";
                }
            }
        });

        if (!merged) {
            this.players.push({
                name: name,
                id: id,
                ip: ip,
                connected: true,
                score: 0
            });
        }

        this.sendScoreboard();
    }

    getUser(id) {
        return this.players.find(x => x.id === id);
    }

    getName(id) {
        return this.getUser(id).name;
    }

    getScore(id) {
        return this.getUser(id).score;
    }

    changeScore(user, num) {

        let score = 0;

        this.players.forEach(n => {
            if (n.id === user) {
                n.score += num;
                score = n.score;
            }
        });

        this.sendScoreboard();
        return score;
    }

    sendScoreboard() {

        // send user array w/o IP information
        const users = this.players.map(n => {
            const obj = {...n};
            delete obj.ip;
            return obj;
        });

        console.log(this.players, users);
        this.io.emit("sendScoreboard", users);
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
const Question = require("./Question");
const QuestionBank = require("./QuestionBank");
const Checker = require("./Checker");
const Users = require("./Users");
const Timer = require("./Timer");

class Room {

    constructor(name, io) {

        console.log(`Room '${name}' created!`);

        this.loading = true;

        this.name = name;
        this.players = [];
        this.question = null;

        this.rules = {
            canSkip     : true,
            canPause    : true,
            canMultiBuzz: true
        }

        /*
        * Public = 2
        * Unlisted = 1
        * Private = 0
        */
        this.privacy = 2;

        // index of "this.players"
        this.buzzed = -1;
        this.prompted = false;

        this.io = io.of(name);
        this.listen();

        this.fetchQuestionBank({

            "query"			: "",
            "search_type"	: "",
            "difficulty"	: ["national_high_school"],
            "category"      : [17],
            "subcategory"   : [],
            "question_type"	: "Tossup",
            "limit"			: "true",
            "download"		: "json"

        });

        this.timerCount = 7;

        this.logHistory = [];
        this.checker = new Checker();
        this.users = new Users(this.io);
        this.timer = new Timer(this.io, () => this.clearBuzz(), "buzz");

        this.buzzedOut = [];

    }

    listen() {

        this.io.on("connection", socket => {

            let latency = Date.now();

            const name = socket.handshake.query.name;

            // get IP, whether running locally or on Heroku
            const ip =  socket.handshake.headers["x-forwarded-for"] ||
                        socket.handshake.address;

            this.users.addUser(name, socket.id, ip);

            // update previous log messages
            this.io.to(socket.id).emit("updateLogHistory", this.logHistory);

            this.log(`${this.users.getName(socket.id)} connected (total players ${this.users.players.length})`);

            if (this.loading)           this.io.to(socket.id).emit("loading");
            else if (!this.question)    this.io.to(socket.id).emit("loaded");

            // update players who joined in the middle of a question
            if (this.question) this.question.update(socket.id);

            // update buzzer status
            if (this.buzzed !== -1)
                this.io.to(socket.id).emit("playerBuzzed", this.users.getUserByIndex(this.buzzed));

            socket.on("nextQuestion", () => {

                this.io.emit("clearBuzz");

                if (this.question)
                    this.question.endTimer.clearTimer();

                if (this.buzzed === -1 && this.qb.questions)
                    this.fetchQuestion();
            })

            socket.on("buzz", data => {

                console.log(`Received buzz from ${this.users.getName(socket.id)}`);

                if (this.buzzed === -1 && !this.isBuzzedOut(socket.id)) {

                    this.buzzedOut.push(socket.id);

                    if (this.question) this.question.stop();
                    if (this.question && this.question.finished) this.question.endTimer.clearTimer();

                    this.buzzed = this.users.getIndex(this.users.getUser(socket.id));
                    this.io.emit("playerBuzzed", this.users.getName(socket.id));

                    this.io.to(socket.id).emit("requestAnswer");

                    this.timer.countdown(7);

                }
                else {
                    console.log(`Invalid buzz from ${this.users.getName(socket.id)}!`);
                    this.io.to(socket.id).emit("buzzFailed");
                }
            });

            socket.on("pause", () => this.toggleRead());

            socket.on("sendAnswer", data => {

                console.log("Received answer: " + data);

                if (socket.id === this.users.getIdByIndex(this.buzzed) && this.question) {

                    this.io.emit("updateAnswerLine", data);

                    const verdict = this.checker.smartCheck(data, this.question.answer);

                    if (verdict === 2) {

                        const score = this.users.changeScore(socket.id, 10);
                        this.log(`${this.users.getName(socket.id)} buzzed correctly! (score ${score})`);
                        this.question.answered = true;
                        this.question.finishQuestion();
                        this.question.revealAnswer();

                    } else if (verdict === 1 && !this.prompted) {

                        this.log(`[TODO] Prompt...`);

                    } else {
                        
                        if (!this.question.finished) {

                            const score = this.users.changeScore(socket.id, -5);
                            this.log(`${this.users.getName(socket.id)} negged (score ${score})`);
                        
                        } else {
                            this.log(`${this.users.getName(socket.id)} buzzed incorrectly, no penalty.`);
                            this.io.emit("deadTimer");
                            this.question.endTimer.countdown(this.question.endTimer.timer);
                        }

                    }

                    this.timer.clearTimer();
                    this.clearBuzz();

                }

            });

            socket.on("disconnect", () => {
                const name = this.users.getName(socket.id);
                this.users.disconnect(socket.id);
                this.log(`${name} disconnected (total players ${this.players.length})`);
            });
            
            socket.on("changeName", data => {
                this.users.changeName(socket.id, data);
            });

            socket.on("updateSettings", data => {

                const search = data.search;

                this.fetchQuestionBank({
                    "query"			: "",
                    "search_type"	: "",
                    "difficulty"	: search.difficulty.map(n => n.toLowerCase().replace(/ /g, "_")),
                    "category"      : search.category.map(n => parseInt(n)),
                    "subcategory"   : search.subcategory.map(n => parseInt(n))
                });

                this.privacy = parseInt(data.security.privacy);
                this.rules = data.rules;

                // TODO: hash password?
                this.password = data.security.password;

                this.log("Room settings updated.");


            });

            socket.on("clearBuzz", () => this.clearBuzz());
            socket.on("chat", data => {});

            socket.on("netCheck", () => {
                const ms = Math.abs(Date.now() - latency - 2000);
                latency = Date.now();
                socket.emit("latency", ms);
            });

        });

    }

    clearBuzz() {

        if (this.timer)
            this.timer.clearTimer();

        if (this.question) {
            if (!this.question.reading && !this.question.finished) {
                this.question.start();
            }
        }

        this.buzzed = -1;
        this.io.emit("clearBuzz");

        console.log("Clearing buzz...");

    }

    isBuzzedOut(id) {
        if (this.rules.canMultiBuzz) return false;
        else return this.buzzedOut.includes(id);
    }

    toggleRead() {

        if (this.question) {
            if (!this.question.reading) this.question.start();
            else                        this.question.stop();
        }
    }

    fetchQuestionBank(args) {

        this.clearQuestion();

        this.qb = new QuestionBank(args);

        this.loading = true;
        this.io.emit("loading");

        this.question = null;

        this.qb.search().then(n => {
            this.loading = false;
            this.io.emit("loaded");
            console.log(`Loaded ${n} questions!`);
        });

    }

    clearQuestion() {

        this.clearBuzz();

        if (this.question) this.question.stop();

        this.io.emit("clearQuestion");

    }

    fetchQuestion() {

        if (this.question) this.question.stop();
        this.buzzed = -1;
        this.buzzedOut = [];

        this.io.emit("clearQuestion");
        const q = this.qb.fetchQuestion();

        console.log(q);

        this.question = new Question(q.text, q.formatted_answer, q.info, 125, this.io, q);
    }

    log(msg) {

        console.log(msg);
        this.io.emit("log", msg + "\n");
        this.logHistory.unshift(msg);

    }

    getName()       { return this.name; }
    getPrivacy()    { return this.privacy; }
    getPassword()   { return this.password; }

}

module.exports = Room;
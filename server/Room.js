const Question = require("./Question");
const QuestionBank = require("./QuestionBank");
const Checker = require("./Checker");
const Users = require("./Users");
const Chat = require("./Chat");
const Timer = require("./Timer");
const _     = require("lodash/core");

class Room {

    constructor(name, io) {

        console.log(`Room '${name}' created!`);

        this.loading = true;

        this.name = name;
        this.players = [];
        this.question = null;

        // room rules object
        this.rules = {
            canSkip     : true,
            canPause    : true,
            canMultiBuzz: true,
            speed       : 125
        }

        // QuizDB query object
        // used to fetch question bank
        this.query = {
            category    : [],
            subcategory : [],
            difficulty  : []
        }

        /*
        * Public            = 2
        * Unlisted          = 1
        * (TODO) Private    = 0
        */
        this.privacy = 2;

        // indicates current buzzed-in player
        // index of "this.players" (-1 is cleared buzzer)
        this.buzzed = -1;

        this.prompted = false;

        // open socket.io connection
        this.io = io.of(name);
        this.listen();

        this.fetchQuestionBank({

            "query"			: "",
            "search_type"	: "",
            "difficulty"	: this.query.difficulty,
            "category"      : this.query.category,
            "subcategory"   : this.query.subcategory,
            "question_type"	: "Tossup",
            "limit"			: "true",
            "download"		: "json"

        });

        this.timerCount = 7;

        this.logHistory = [];
        this.checker = new Checker();
        this.chat = new Chat(this.io);
        this.users = new Users(this.io);
        this.timer = new Timer(this.io, () => this.clearBuzz(), "buzz");

        // tracks players who have already buzzed
        this.buzzedOut = [];

    }

    listen() {

        this.io.on("connection", socket => {

            const name = socket.handshake.query.name;
            const token = socket.handshake.query.token;

            // get IP, whether running locally or on Heroku
            const ip =  socket.handshake.headers["x-forwarded-for"] ||
                        socket.handshake.address;

            this.users.addUser(name, socket.id, ip, token);

            // send client previous log messages
            this.io.to(socket.id).emit("updateLogHistory", this.logHistory);

            // send client current room settings
            this.io.to(socket.id).emit("syncSettings", {
                search  : this.query,
                privacy : this.privacy,
                rules   : this.rules
            });

            this.log(`${this.users.getName(socket.id)} connected (total players ${this.users.getOnline()})`);

            // display loading message if necessary
            if (this.loading)           this.io.to(socket.id).emit("loading");
            else if (!this.question)    this.io.to(socket.id).emit("loaded");

            // send client current question (if in the middle of one)
            if (this.question) {

                if (this.question.answered) {
                    this.io.to(socket.id).emit("revealAnswer", {
                        answer: this.question.answer,
                        info:   this.question.info
                    });
                }

                this.question.update(socket.id);
            }

            // send client the current buzzer status
            if (this.buzzed !== -1)
                this.io.to(socket.id).emit("playerBuzzed", this.users.getUserByIndex(this.buzzed));

            // fired when client requests next question
            socket.on("nextQuestion", () => {

                // if client is allowed to ask for next question
                if (!this.question || this.question.answered || (this.rules.canSkip && this.buzzed === -1)) {

                    this.io.emit("clearBuzz");

                    if (this.question) {

                        // reveal answer for question history
                        this.question.finishQuestion();
                        this.question.revealAnswer();

                        // clear any timers present
                        this.question.endTimer.clearTimer();
                    }

                    // if no one's buzzed in, fetch a new question
                    if (this.buzzed === -1 && this.qb.questions)
                        this.fetchQuestion();

                }

            });

            // fired when a player buzzes in
            socket.on("buzz", data => {

                console.log(`Received buzz from ${this.users.getName(socket.id)}`);

                // if no one's currently buzzed in and the player hasn't already buzzed
                // (if multi buzzing is enabled in room settings, the latter is true regardless)
                if (this.buzzed === -1 && !this.isBuzzedOut(socket.id)) {

                    // add player to list of players who have buzzed
                    this.buzzedOut.push(socket.id);

                    // pause the question
                    if (this.question) this.question.stop();

                    // if question has finished being read, clear the "dead question" timer
                    if (this.question && this.question.finished) this.question.endTimer.clearTimer();

                    // get the player who buzzed and tell the clients
                    this.buzzed = this.users.getIndex(this.users.getUser(socket.id));
                    this.io.emit("playerBuzzed", this.users.getName(socket.id));

                    // ask the player who buzzed for an answer
                    this.io.to(socket.id).emit("requestAnswer");

                    this.timer.countdown(7);

                }
                else {
                    console.log(`Invalid buzz from ${this.users.getName(socket.id)}!`);
                    this.io.to(socket.id).emit("buzzFailed");
                }
            });

            socket.on("pause", () => { if (this.rules.canPause && this.buzzed === -1) this.toggleRead() });

            // fired when client sends their guess
            socket.on("sendAnswer", data => {

                console.log("Received answer: " + data);

                // if player who sent answer was the one who was buzzed in
                if (socket.id === this.users.getIdByIndex(this.buzzed) && this.question) {

                    // send all clients the guess
                    this.io.emit("updateAnswerLine", data);

                    const verdict = this.checker.smartCheck(data, this.question.answer);

                    // CORRECT answer
                    if (verdict === 2) {

                        if (this.question.index <= this.question.powerIndex) {
                            this.users.changeScore(socket.id, 15);
                            this.log(`${this.users.getName(socket.id)} powered!`);
                        }
                        else {
                            this.users.changeScore(socket.id, 10);
                            this.log(`${this.users.getName(socket.id)} buzzed correctly!`);
                        }

                        this.question.finishQuestion();
                        this.question.revealAnswer();

                    
                    // TODO: implement a successful prompting solution
                    //
                    // } else if (verdict === 1 && !this.prompted) {


                    // INCORRECT answer
                    } else {
                        
                        if (!this.question.finished) {

                            this.users.changeScore(socket.id, -5);
                            this.log(`${this.users.getName(socket.id)} negged.`);
                        
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
                this.log(`${name} disconnected (total players ${this.users.getOnline()})`);
            });
            
            socket.on("changeName", data => {
                this.users.changeName(socket.id, data);
            });

            // fired when a client changes the room's settings
            socket.on("updateSettings", data => {

                // if the QuizDB query parameters were changed,
                // fetch a new question bank using the new settings
                if (!_.isEqual(data.search, this.query)) {

                    this.query = data.search;

                    this.fetchQuestionBank({
                        "query"			: "",
                        "search_type"	: "",
                        "difficulty"	: this.query.difficulty.map(n => n.toLowerCase().replace(/ /g, "_")),
                        "category"      : this.query.category.map(n => parseInt(n)),
                        "subcategory"   : this.query.subcategory.map(n => parseInt(n))
                    });

                }

                this.privacy = parseInt(data.security.privacy);
                this.rules = data.rules;

                // TODO: unimplemented feature
                // password is used for private rooms
                // perhaps hash this password if implemented?
                this.password = data.security.password;

                // send new settings to all clients
                this.io.emit("syncSettings", {
                    search  : this.query,
                    privacy : this.privacy,
                    rules   : this.rules
                });

                this.log("Room settings updated.");

            });

            socket.on("chat", data => {
                const author = this.users.getName(socket.id);
                const msg = this.chat.clean(data.msg);
                this.log(msg, author);
            });

            // used to calculate client latency to server
            // this calculation and warning is displayed client-side
            socket.on("netCheck", () => socket.emit("netRes"));

        });

    }

    clearBuzz() {

        // reset the timer
        if (this.timer)
            this.timer.clearTimer();

        // unpause the question
        if (this.question) {
            if (!this.question.reading && !this.question.finished) {
                this.question.start();
            }
        }

        // clear buzzer state
        this.buzzed = -1;
        this.io.emit("clearBuzz");

        console.log("Clearing buzz...");

    }

    // helper method used to find if a player has buzzed before
    // this only applies for the current question;
    // it also returns false if multi buzzing is enabled
    isBuzzedOut(id) {
        if (this.rules.canMultiBuzz) return false;
        else return this.buzzedOut.includes(id);
    }

    // pauses/unpauses question reading
    toggleRead() {

        if (this.question) {
            if (!this.question.reading) this.question.start();
            else                        this.question.stop();
        }
    }

    fetchQuestionBank(args) {

        this.clearQuestion();

        this.qb = new QuestionBank(args);

        // send "question loading" message to clients
        this.loading = true;
        this.io.emit("loading");

        this.question = null;

        // search QuizDB for new questions
        this.qb.search().then(n => {
            this.loading = false;
            this.io.emit("loaded");
            console.log(`Loaded ${n} questions!`);
        });

    }

    // clears buzzer and pauses question
    clearQuestion() {

        this.clearBuzz();

        if (this.question) this.question.stop();
   
        this.io.emit("clearQuestion");

    }

    // gets random question from question bank
    fetchQuestion() {

        if (this.question) this.question.stop();
        this.buzzed = -1;
        this.buzzedOut = [];

        this.io.emit("clearQuestion");
        const q = this.qb.fetchQuestion();

        console.log(q);

        this.question = new Question(q.text, q.formatted_answer, q.info, this.rules.speed, this.io, q);
    }

    // adds message to server log
    // this log is synced with all clients
    log(msg, author) {

        const str = author ? `${author}: ${msg}` : msg;
        console.log(str);

        this.io.emit("log", { author, msg });
        this.logHistory.unshift({ author, msg });

    }

    getName()       { return this.name; }
    getPrivacy()    { return this.privacy; }
    getPassword()   { return this.password; }

}

module.exports = Room;
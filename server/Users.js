const Namer = require("./Namer");

class Users {

    constructor(io) {

        this.addUser = this.addUser.bind(this);
        this.getUser = this.getUser.bind(this);
        this.getIndex = this.getIndex.bind(this);
        this.getName = this.getName.bind(this);
        this.getScore = this.getScore.bind(this);
        this.sendScoreboard = this.sendScoreboard.bind(this);
        this.disconnect = this.disconnect.bind(this);

        this.io = io;
        this.players = [];
    }

    addUser(name=Namer.random(), id, ip) {

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

    getIdByIndex(index) {
        if (index === -1) {
            console.log("this.buzzed -1");
            return null;
        }
        return this.players.find(x => x === this.players[index]).id;
    }

    getUserByIndex(index) {
        return this.players[index];
    }

    getIndex(user) {
        return this.players.indexOf(user);
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

    changeName(id, name) {

        this.players.forEach(n => {
            if (n.id === id)
                n.name = name;
        });

        this.sendScoreboard();
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

    disconnect(id) {
        const name = this.getName(id);

        this.players.forEach(n => {
            if (n.id === id)
                n.connected = false;
        });

        this.players = this.players.filter(x => x.id !== id || x.ip !== "guest");
        this.sendScoreboard();
    }

}

module.exports = Users;
const Namer = require("./Namer");
const jwt = require("jsonwebtoken");

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

    addUser(name=Namer.random(), id, ip, token) {

        let merged = false;
        let doppled = false;

        this.players.forEach(n => {

            let newToken = this.decodeToken(n.token);
            let userToken = this.decodeToken(token);

            console.log(`New token:  ${newToken}`);
            console.log(`User token: ${userToken}`);

            if (newToken === userToken) {

                if (!n.connected) {
                    n.id = id;
                    n.connected = true;
                    merged = true;
                } else {
                    name = n.name + "'s Doppelganger";
                    ip = "guest";
                    doppled = true;
                }
            }

        });

        if (!merged) {

            const newToken = jwt.sign({ data: id }, "temp_secret");

            this.players.push({
                name: name,
                id: id,
                ip: ip,
                token: newToken,
                connected: true,
                stats: {
                    score: 0,
                    powers: 0,
                    gets: 0,
                    negs: 0
                }
            });

            if (!doppled) this.io.to(id).emit("newToken", newToken);

        }

        this.sendScoreboard();
    }

    getUser(id) {
        return this.players.find(x => x.id === id);
    }

    getIdByIndex(index) {
        if (index === -1) return null;
        return this.players.find(x => x === this.players[index]).id;
    }

    getUserByIndex(index) {
        return this.players[index];
    }

    getIndex(user) {
        return this.players.indexOf(user);
    }

    getName(id) {
        console.log(this.players);
        return this.getUser(id).name;
    }

    getScore(id) {
        return this.getUser(id).stats.score;
    }

    getOnline() {
        return this.players.filter(x => x.connected).length;
    }

    changeScore(user, num) {

        let score = 0;

        this.players.forEach(n => {
            if (n.id === user) {
                n.stats.score += num;
                score = n.stats.score;

                if (num === 15) n.stats.powers++;
                if (num === 10) n.stats.gets++;
                if (num === -5)  n.stats.negs++;
            }
        });

        this.sendScoreboard();
        return score;
    }

    changeName(id, name) {

        this.players.forEach(n => {
            if (n.id === id) {
                if (name.trim())    n.name = name;
                else                n.name = Namer.random();    
            }
        });

        this.sendScoreboard();
    }

    sendScoreboard() {

        // send user array w/o certain information
        const users = this.players.map(n => {
            const obj = {...n};
            delete obj.ip;
            delete obj.token;
            return obj;
        });

        this.io.emit("sendScoreboard", users);
    }

    disconnect(id) {

        this.players.forEach(n => {
            if (n.id === id)
                n.connected = false;
        });

        this.players = this.players.filter(x => x.id !== id || x.ip !== "guest");

        this.sendScoreboard();
    }

    decodeToken(token) {

        try         { return jwt.verify(token, "temp_secret").data; }
        catch (err) { return ""; }

    }

}

module.exports = Users;
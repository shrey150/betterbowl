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

        // signifies if player is rejoining room
        let merged = false;

        // signifies if player is joining from the same browser
        // using multiple tabs; thus, they are a "doppelganger"
        let doppled = false;

        this.players.forEach(n => {

            let newToken = this.decodeToken(n.token);
            let userToken = this.decodeToken(token);

            console.log(`New token:  ${newToken}`);
            console.log(`User token: ${userToken}`);

            // if "token" exists in players list
            if (newToken === userToken) {

                // if they are marked disconnected,
                // they must be rejoining and "merged"
                if (!n.connected) {
                    n.id = id;
                    n.connected = true;
                    merged = true;

                // otherwise, they are joining twice from the same browser;
                // they are a doppelganger of another player and therefore
                // will not be saved as a player (stats will be deleted on disconnect)
                } else {
                    name = n.name + "'s Doppelganger";
                    ip = "guest";
                    doppled = true;
                }
            }

        });

        // if player was rejoining the room,
        // update their old token with new socket id
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

        // update scoreboard for clients
        this.sendScoreboard();
    }

    //==============================================================
    // GETTER METHODS

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

    getStats(id) {
        return this.getUser(id).stats;
    }

    getScore(id) {
        return this.getUser(id).stats.score;
    }

    getOnline() {
        return this.players.filter(x => x.connected).length;
    }
    //==============================================================

    // update a player's score
    changeScore(id, num) {

        let score = 0;

        this.players.forEach(n => {
            if (n.id === id) {
                n.stats.score += num;
                score = n.stats.score;

                // update player stats (P/G/N)
                if (num === 15) n.stats.powers++;
                if (num === 10) n.stats.gets++;
                if (num === -5)  n.stats.negs++;
            }
        });

        // update scoreboard for clients
        this.sendScoreboard();
        return score;
    }

    resetScore(id) {

        let score = 0;

        this.players.forEach(n => {

            if (n.id === id) {

                score = n.stats.score;

                n.stats.score = 0;
                n.stats.powers = 0;
                n.stats.gets = 0;
                n.stats.negs = 0;
            }
        });

        // update scoreboard for clients
        this.sendScoreboard();
        return score;
    }

    changeName(id, name) {

        this.players.forEach(n => {
            if (n.id === id) {
                
                // if "name" was empty, give them a random name
                if (name.trim())    n.name = name;
                else                n.name = Namer.random();    
            }
        });

        // update scoreboard for clients
        this.sendScoreboard();
    }

    sendScoreboard() {

        // send user array w/o certain information:
        // IP address and client token are private info
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

        // if player was marked as a guest ("doppelganger"), remove them from list
        this.players = this.players.filter(x => x.id !== id || x.ip !== "guest");

        // update scoreboard for clients
        this.sendScoreboard();
    }

    // helper method used to verify client web token;
    // this is used to see if player has joined room before
    decodeToken(token) {

        try         { return jwt.verify(token, "temp_secret").data; }
        catch (err) { return ""; }

    }

}

module.exports = Users;
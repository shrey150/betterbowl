const express = require("express");
const app = express();
const server = require("http").Server(app);
const port = process.env.PORT || 3000;
const io = require("socket.io")(server); 
const path = require("path");

const Room = require("./Room");

const rooms = [];

app.use("/game", express.static("client/game"));
app.use("/home", express.static("client/home"));

app.get("/api/fetchRooms", (req, res) => {
    res.json(rooms.map(roomInfo).filter(n => n));
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/home.html"));
});

app.get("/game/socket.io.js", (req, res) => {
    res.sendFile(path.join(__dirname, "../node_modules/socket.io-client/dist/socket.io.js"));
});

app.get("/game/socket.io.js.map", (req, res) => {
    res.send("Source maps not enabled");
});

app.get("/favicon.ico", (req, res) => {
    res.send("Favicon not enabled");
});

app.get("/*", (req, res) => {

    if (getRoomIndex(req.path) === -1) {
        rooms.push(new Room(req.path, io));
    }
    else if (rooms[getRoomIndex(req.path)].privacy === 0) {
        res.sendFile(path.join(__dirname, "../client/auth.html"));
        return;
    }

    res.sendFile(path.join(__dirname, "../client/game.html"));
        
});

function getRoomIndex(name) {

    let index = -1;

    for (i = 0; i < rooms.length; i++) {
        if (rooms[i].name === name)
            index = i;
    }

    return index;
}

function roomInfo(n) {

    if (n.privacy < 2) return null;

    return {
        name: n.getName(),
        players: n.users.players.length,
        categories: "Good Quizbowl"
    }
}

server.listen(port, () => console.log(`server running on port ${port}`));
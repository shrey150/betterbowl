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
    res.json(rooms.map(roomInfo));
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/home.html"));
});

app.get("/game/socket.io.js", (req, res) => {
    res.sendFile(path.join(__dirname, "../node_modules/socket.io-client/dist/socket.io.js"));
});

app.get("/*", (req, res) => {

    if (!roomExists(req.path))
        rooms.push(new Room(req.path, io));

    res.sendFile(path.join(__dirname, "../client/game.html"));
});

function roomExists(name) {

    let exists = false;

    rooms.forEach(n => {
        if (n.getName() === name)
            exists = true;
    });

    return exists;
}

function roomInfo(n) {
    return {
        name: n.getName(),
        players: n.users.players.length,
        categories: "Science Nats"
    }
}

server.listen(port, () => console.log(`server running on port ${port}`));
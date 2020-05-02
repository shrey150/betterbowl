const express = require("express");
const app = express();
const server = require("http").Server(app);
const port = process.env.PORT || 3000;
const io = require("socket.io")(server); 
const path = require("path");

const Room = require("./Room");

const rooms = [];

// static directories
app.use("/game", express.static("client/game"));
app.use("/home", express.static("client/home"));

// API endpoint for home.html to get room info
app.get("/api/fetchRooms", (req, res) => {
    res.json(rooms.map(roomInfo).filter(n => n));
});

// home page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/home.html"));
});

/*
STATIC FILES
*/
app.get("/robots.txt", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/robots.txt"));
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

// all other URL requests
// this is for room links
app.get("/*", (req, res) => {

    // if room doesn't exist, create it
    if (getRoomIndex(req.path) === -1) {
        rooms.push(new Room(req.path, io));
    }
    // if room is private (unimplemented feature), send to password screen
    else if (rooms[getRoomIndex(req.path)].privacy === 0) {
        res.sendFile(path.join(__dirname, "../client/auth.html"));
        return;
    }

    // send game room webpage
    res.sendFile(path.join(__dirname, "../client/game.html"));
        
});

// gets the index of a room in the rooms list array
// returns -1 if room name does not exist 
function getRoomIndex(name) {

    let index = -1;

    for (i = 0; i < rooms.length; i++) {
        if (rooms[i].name === name)
            index = i;
    }

    return index;
}

// returns room name, # of players, and categories
function roomInfo(n) {

    if (n.privacy < 2) return null;

    return {
        name: n.getName(),
        players: n.users.players.length,
        categories: "Good Quizbowl"
    }
}

server.listen(port, () => console.log(`Server running - http://localhost:${port}`));   
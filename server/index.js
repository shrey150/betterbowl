const express = require("express");
const app = express();
const server = require("http").Server(app);
const port = process.env.PORT || 3000;
const io = require("socket.io")(server); 
const path = require("path");

const Room = require("./Room");

const main = new Room("", io);

app.use(express.static("client"));

app.get("/socket.io.js", (req, res) => {
    res.sendFile(path.join(__dirname, "../node_modules/socket.io-client/dist/socket.io.js"));
});

server.listen(port, () => console.log(`server running on port ${port}`));
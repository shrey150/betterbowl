console.log("script.js loaded");

let socket = io();
let question = document.querySelector("#question");
let buzzBtn = document.querySelector("#buzzBtn");
let nextBtn = document.querySelector("#nextBtn");

socket.on("connect", data => {

    console.log("Connected to server!");

    socket.on("questionUpdate", data => {
        question.append(data);
        nextBtn.innerHTML = "Next";
    });

    socket.on("clearQuestion", data => {
        console.log("Clearing question...");
        question.innerHTML = "";
    });

    socket.on("clearBuzz", data => {
        console.log("Clearing buzz...");
        buzzBtn.disabled = false;
    })

    socket.on("playerBuzzed", data => {
        console.log("Player buzzed!");
        buzzBtn.disabled = true;
    });

    socket.on("buzzFailed", data => {
        console.log("Buzz failed!");
    });

    socket.on("pong", () => console.log("pong"));

});

function nextQuestion() {
    socket.emit("nextQuestion");
    nextBtn.innerHTML = "Next";
}

function buzz() {
    console.log("Trying to buzz...");
    socket.emit("buzz");
}

function clearBuzz() {
    console.log("[DEBUG] clearing buzz");
    socket.emit("clearBuzz");
}

window.addEventListener("keydown", e => {

    switch (e.key) {

        case " ":
            buzz();
            break;

        case "n":
            nextQuestion();
            break;

        case "Escape":
            clearBuzz();
            break;

        default:
            break;

    }

});
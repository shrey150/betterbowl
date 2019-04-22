console.log("script.js loaded");

let socket = io();
let question = document.querySelector("#question");
let log = document.querySelector("#log");
let buzzBtn = document.querySelector("#buzzBtn");
let nextBtn = document.querySelector("#nextBtn");
let answerInput = document.querySelector("#answerInput");

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
        answerInput.setAttribute("hidden", "");
        answerInput.value = "";
    })

    socket.on("playerBuzzed", data => {
        console.log("Player buzzed!");
        buzzBtn.disabled = true;
    });

    socket.on("buzzFailed", data => {
        console.log("Buzz failed!");
    });

    socket.on("requestAnswer", data => {
        console.log("Request answer:");
        answerInput.removeAttribute("hidden");
        answerInput.focus();
    });

    socket.on("pong", () => console.log("pong"));

    socket.on("log", data => {
        let msg = document.createElement("p");
        msg.innerHTML = data;
        log.insertBefore(msg, log.firstChild);

    });

    socket.on("updateLogHistory", data => {

        let msgs = "";
        data.forEach(n => msgs += `<p>${n}</p>`);
        log.innerHTML += msgs;

    });

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
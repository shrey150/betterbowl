console.log("script.js loaded");

let socket = io();
let question = document.querySelector("#question");
let log = document.querySelector("#log");
let buzzBtn = document.querySelector("#buzzBtn");
let nextBtn = document.querySelector("#nextBtn");
let answerInput = document.querySelector("#answerInput");
let timerText = document.querySelector("#timer");
let scores = document.querySelector("#scores");
let answer = document.querySelector("#answer");
let q_info = document.querySelector("#q_info");
let username = document.querySelector("#username");

let timerInterval;
let autoSendTimer;
let timerValue = 7;

socket.on("connect", data => {

    console.log("Connected to server!");

    socket.on("questionUpdate", data => {
        question.append(data);
        nextBtn.innerHTML = "Next";
    });

    socket.on("clearQuestion", data => {
        console.log("Clearing question...");
        question.innerHTML = "";
        answer.innerHTML = "";
        q_info.innerHTML = "";
        answer.setAttribute("hidden", "");
        q_info.setAttribute("hidden", "");
    });

    socket.on("clearBuzz", data => {
        console.log("Clearing buzz...");
        buzzBtn.disabled = false;
        answerInput.setAttribute("hidden", "");
        answerInput.value = "";
        timerText.setAttribute("hidden", "");
        document.querySelector("#answerLine").removeAttribute("id");
    })

    socket.on("playerBuzzed", data => {
        console.log("Player buzzed!");
        buzzBtn.disabled = true;
        timerText.removeAttribute("hidden");
        timerText.removeAttribute("style");
    });

    socket.on("updateAnswerLine", updateAnswerLine);
    socket.on("revealAnswer", data => {
        answer.removeAttribute("hidden");
        q_info.removeAttribute("hidden");
        answer.innerHTML = data.answer;
        q_info.innerHTML = data.info;
    });

    socket.on("buzzFailed", data => {
        console.log("Buzz failed!");
    });

    socket.on("requestAnswer", data => {
        console.log("Request answer:");
        answerInput.removeAttribute("hidden");
        answerInput.focus();

        autoSendTimer = setTimeout(sendAnswer, 7000);
    });

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

    socket.on("sendScoreboard", data => {
        console.log("Updating scoreboard");
        let elements = "";
        data.forEach(n => {
            console.log(n);
            const gray = !n.connected ? "color: gray" : "";
            elements += `<p style='${gray}'>${n.name}: ${n.score}</p>`;
        });
        scores.innerHTML = elements;
    });

    socket.on("deadTimer", data => {
        timerText.removeAttribute("hidden");
        timerText.setAttribute("style", "color: red");
    });

    socket.on("tick", data => {
        timerText.innerHTML = data.toFixed(1);
    });

});

function nextQuestion() {
    socket.emit("nextQuestion");
}

function sendAnswer() {
    console.log("Sending answer...");
    socket.emit("sendAnswer", answerInput.value);
    clearTimeout(autoSendTimer);
}

function buzz() {
    console.log("Trying to buzz...");
    socket.emit("buzz");
}

function pause() {
    console.log("Pausing...");
    socket.emit("pause");
}

function changeName() {
    socket.emit("changeName", username.value);
}

function clearBuzz() {
    console.log("[DEBUG] clearing buzz");
    socket.emit("clearBuzz");
}

function updateAnswerLine(data) {

    const liveAnswer = document.querySelector("#answerLine");

    if (!liveAnswer) {
        let msg = document.createElement("i");
        msg.innerHTML = data;
        msg.setAttribute("id", "answerLine");
        msg.setAttribute("class", "buzz");
        log.insertBefore(msg, log.firstChild);
    }
    else {
        liveAnswer.innerHTML = data;
    }
}
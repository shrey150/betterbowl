console.log("script.js loaded");

let socket = io(`${window.location.pathname}`);

let timerInterval;
let autoSendTimer;
let timerValue = 7;

const $ = document.querySelector.bind(document);

socket.on("connect", data => {

    console.log("Connected to server!");

    socket.on("questionUpdate", data => {
        $("#question").append(data);
        $("#nextBtn").innerHTML = "Next";
    });

    socket.on("clearQuestion", data => {
        console.log("Clearing question...");
        $("#question").innerHTML = "";
        $("#answer").innerHTML = "";
        $("#q_info").innerHTML = "";
        $("#answer").setAttribute("hidden", "");
        $("#q_info").setAttribute("hidden", "");
    });

    socket.on("clearBuzz", data => {
        console.log("Clearing buzz...");
        $("#buzzBtn").disabled = false;
        $("#answerInput").setAttribute("hidden", "");
        $("#answerInput").value = "";
        $("#timer").setAttribute("hidden", "");
        document.querySelector("#answerLine").removeAttribute("id");
    })

    socket.on("playerBuzzed", data => {
        console.log("Player buzzed!");
        $("#buzzBtn").disabled = true;
        $("#timer").removeAttribute("hidden");
        $("#timer").removeAttribute("style");
    });

    socket.on("updateAnswerLine", updateAnswerLine);
    socket.on("revealAnswer", data => {
        $("#answer").removeAttribute("hidden");
        $("#q_info").removeAttribute("hidden");
        $("#answer").innerHTML = data.answer;

        const breadcrumb = data.info.reduce((str, n) => str += `<li class="breadcrumb-item">${n}</li>`, "");

        $("#q_info").innerHTML = breadcrumb;
    });

    socket.on("buzzFailed", data => {
        console.log("Buzz failed!");
    });

    socket.on("requestAnswer", data => {
        console.log("Request answer:");
        $("#answerInput").removeAttribute("hidden");
        $("#answerInput").focus();

        autoSendTimer = setTimeout(sendAnswer, 7000);
    });

    socket.on("loading", () => {
        $("#question").innerHTML = `Loading questions... (This may take a while as questions are being requested from QuizDB. This will be considerably faster in a later update.)`;
    });

    socket.on("loaded", () => {
        $("#question").innerHTML = "Questions loaded! Press <code>n</code> to start reading questions.";
    });

    socket.on("log", data => {
        let msg = document.createElement("li");
        msg.setAttribute("class", "list-group-item");
        msg.innerHTML = data;
        $("#log").insertBefore(msg, $("#log").firstChild);
    });

    socket.on("updateLogHistory", data => {
        let msgs = "";
        data.forEach(n => msgs += `<li class="list-group-item">${n}</li>`);
        $("#log").innerHTML += msgs;
    });

    socket.on("sendScoreboard", data => {
        console.log("Updating scoreboard");
        let elements = "";
        data.forEach(n => {
            const gray = !n.connected ? "color: gray" : "";
            elements += `<li class="list-group-item d-flex justify-content-between align-items-center">
                            ${n.name}
                            <span class="badge badge-secondary badge-pill">${n.score}</span>
                        </li>`;
        });
        $("#scores").innerHTML = elements;
    });

    socket.on("tick", data => {

        $("#timer").removeAttribute("hidden");

        if (data.type === "dead") {
            $("#timer").setAttribute("style", "color: red");
        }
        else {
            $("#timer").setAttribute("style", "");
        }
        
        $("#timer").innerHTML = data.time.toFixed(1);
    });

});

function nextQuestion() {
    socket.emit("nextQuestion");
}

function sendAnswer() {
    console.log("Sending answer...");
    socket.emit("sendAnswer", $("#answerInput").value);
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
    socket.emit("changeName", $("#username").value);
}

function clearBuzz() {
    console.log("[DEBUG] clearing buzz");
    socket.emit("clearBuzz");
}

function updateAnswerLine(data) {

    const liveAnswer = document.querySelector("#answerLine");

    if (!liveAnswer) {
        let msg = document.createElement("li");
        msg.setAttribute("class", "list-group-item list-group-item-primary");
        msg.innerHTML = data;
        $("#log").insertBefore(msg, $("#log").firstChild);
    }
    else {
        liveAnswer.innerHTML = data;
    }
}

function saveSettings() {

    //const search        = jQuery("#qSearch").val();
    //const type          = jQuery("#searchType").val();
    const category      = jQuery("#category").val();
    const subcategory   = jQuery("#subcategory").val();
    const difficulty    = jQuery("#difficulty").val();

    console.log(category, subcategory, difficulty);

    socket.emit("updateSettings", { category, subcategory, difficulty });
}

function updateSubcats() {

    const category = jQuery("#category").val();
    $("#subcategory").innerHTML = "";

    category.forEach(n => {

        let options = "";

        subcats[n].forEach(m => {
            options += `<option value="${subIds[m]}">${m}</option>`;
        });

        $("#subcategory").innerHTML += options;
        jQuery("#subcategory").selectpicker("refresh");

    });
}

window.onclick = e => {

    if (e.target === $("#settings"))
        $("#settings").style.display = "";

}
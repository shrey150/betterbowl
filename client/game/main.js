console.log("Client loaded!");

let socket = io(`${window.location.pathname}`);

let timerInterval;
let autoSendTimer;
let timerValue = 7;

let pings = [];

let lastPing = Date.now();

socket.on("connect", data => {

    console.log("Connected to server!");

    socket.on("questionUpdate", data => {
        $("#question").append(data);
        $("#nextBtn").text("Next");
    });

    socket.on("clearQuestion", data => {
        console.log("Clearing question...");
        $("#question").empty();
        $("#answer").empty();
        $("#q_info").empty();
        $("#answer").hide();
        $("#q_info").hide();
    });

    socket.on("clearBuzz", data => {
        console.log("Clearing buzz...");
        $("#buzzBtn").attr("disabled", false);
        $("#answerInput").hide();
        $("#answerInput").val("");
        $("#timer").hide();
    })

    socket.on("playerBuzzed", data => {
        console.log("Player buzzed!");
        $("#buzzBtn").attr("disabled", true);
        $("#timer").show();
        $("#timer").removeAttr("style");
    });

    socket.on("updateAnswerLine", updateAnswerLine);
    socket.on("revealAnswer", data => {
        $("#answer").show();
        $("#q_info").show();
        $("#answer").html(data.answer);

        data.info.forEach(n => $("#q_info").append(`<li class="breadcrumb-item">${n}</li>`));
    });

    socket.on("buzzFailed", data => {
        console.log("Buzz failed!");
    });

    socket.on("requestAnswer", data => {
        console.log("Request answer:");
        $("#answerInput").show();
        $("#answerInput").focus();

        autoSendTimer = setTimeout(sendAnswer, 7000);
    });

    socket.on("syncSettings", data => {

        const difficulty    = data.search.difficulty.map(n => _.startCase(n));
        const category      = data.search.category.map(n => n.toString());
        const subcategory   = data.search.subcategory.map(n => n.toString());
        const privacy       = data.privacy.toString();

        $("#difficulty").selectpicker("val", difficulty);
        $("#category").selectpicker("val", category);
        $("#subcategory").selectpicker("val", subcategory);
        $("#privacy").selectpicker("val", privacy);

        $("#canMultiBuzz").prop("checked", data.rules.canMultiBuzz);
        $("#canSkip").prop("checked", data.rules.canSkip);
        $("#canPause").prop("checked", data.rules.canPause);

    });

    socket.on("loading", () => {
        $("#question").text(`Loading questions... (This may take a while as questions are being requested from QuizDB. This will be considerably faster in a later update.)`);
    });

    socket.on("loaded", () => {
        $("#question").html("Questions loaded! Press <code>n</code> to start reading questions.");
    });

    socket.on("log", data => {
        const msg = escapeHTML(data.msg);
        const el = data.author ? `<b>${data.author}</b> ${msg}` : msg;
        $("#log").prepend(`<li class="list-group-item">${el}</li>`);
    });

    socket.on("updateLogHistory", data => {
        data.forEach(n => {
            const msg = escapeHTML(n.msg);
            const el = n.author ? `<b>${n.author}</b> ${msg}` : msg;
            $("#log").append(`<li class="list-group-item">${el}</li>`);
        });
    });

    socket.on("sendScoreboard", data => {
        console.log("Updating scoreboard");
        $("#scores").empty();
        data.forEach(n => {
            const gray = !n.connected ? "color: gray" : "";
            $("#scores").append(`
            <li class="list-group-item d-flex justify-content-between align-items-center">
                ${n.name}
                <span class="badge badge-secondary badge-pill">${n.score}</span>
            </li>`);
        });
    });

    socket.on("tick", data => {

        $("#timer").show();

        if (data.type === "dead") {
            $("#timer").prop("style", "color: red");
        }
        else {
            $("#timer").prop("style", "");
        }
        
        $("#timer").text(data.time.toFixed(1));
    });

    socket.on("netRes", () => {

        const ms = Date.now() - lastPing;
        console.log(`Latency: ${ms}`);

        pings.push(ms);
        if (pings.length >= 5) pings.shift();
        const avgPing = pings.reduce((s,n) => s+n) / pings.length;

        if (avgPing >= 250) {
            console.warn("High latency detected.");
            $("#warnPing").text(`High latency detected (${ms}ms). Try refreshing the page or connecting to a faster network.`);
            $("#warnPing").show();
        }
        else {
            $("#warnPing").hide();
        }

    });

});

function nextQuestion() {
    socket.emit("nextQuestion");
}

function sendAnswer() {
    console.log("Sending answer...");
    socket.emit("sendAnswer", $("#answerInput").val());
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
    socket.emit("changeName", $("#username").val());
}

function clearBuzz() {
    console.log("[DEBUG] clearing buzz");
    socket.emit("clearBuzz");
}

function openChat() {
    $("#chatInput").show();
    $("#chatInput").focus();
}

function sendChat() {
    socket.emit("chat", {
        msg: escapeHTML($("#chatInput").val())
    });

    $("#chatInput").hide();
    $("#chatInput").val("");
}

function updateAnswerLine(data) {

    const liveAnswer = document.querySelector("#answerLine");

    if (!liveAnswer) {
        let msg = document.createElement("li");
        msg.setAttribute("class", "list-group-item list-group-item-primary");
        msg.innerHTML = data;
        $("#log").prepend(msg);
    }
    else {
        liveAnswer.innerHTML = data;
    }
}

function saveSettings() {

    //const search        = $("#qSearch").val();
    //const type          = $("#searchType").val();
    const category      = $("#category").val();
    const subcategory   = $("#subcategory").val();
    const difficulty    = $("#difficulty").val();

    const privacy       = $("#privacy").val();
    const password      = $("#password").val();

    const canSkip       = $("#canSkip").is(":checked");
    const canPause      = $("#canPause").is(":checked");
    const canMultiBuzz  = $("#canMultiBuzz").is(":checked");

    if (privacy === "0" && !password.trim()) {
        alert("Please enter a password.");
        return;
    }

    console.log(category, subcategory, difficulty);
    console.log(canSkip, canPause, canMultiBuzz);

    socket.emit("updateSettings", {
        "search"    : { category, subcategory, difficulty },
        "security"  : { privacy, password },
        "rules"     : { canSkip, canPause, canMultiBuzz }               
    });
}

function updateSubcats() {

    const category = $("#category").val();
    $("#subcategory").empty();

    category.forEach(n => {

        subcats[n].forEach(m => {
            $("#subcategory").append(`<option value="${subIds[m]}">${m}</option>`);
        });

    });

    $("#subcategory").selectpicker("refresh");
}

function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function privacyInfo() {

    switch ($("#privacy").val()) {

        case "2":
            $("#privacyHelp").text("Anyone can join your room and it is publicly advertised on the rooms list.");
            $("#passGroup").hide();
            break;

        case "1":
            $("#privacyHelp").text("People can join your room with a link, but it is NOT advertised on the rooms list.");
            $("#passGroup").hide();
            break;

        // TO BE IMPLEMENTED LATER
        case "0":
            $("#privacyHelp").text("No one can join your room without a password.");
            $("#passGroup").show();
            break;

    }

}

setInterval(() => {
    lastPing = Date.now();
    socket.emit("netCheck");
}, 2000);

window.onclick = e => {
    if (e.target === $("#settings")[0])
        $("#settings").style.display = "";
}

console.log("Client loaded!");
console.log(`Token: ${Cookies.get("bb_token")}`);

// set up socket.io connection to server
let socket = io(`${window.location.pathname}`, {
    query: { token: Cookies.get("bb_token") },
    reconnect: false
});

// timer object that sends answer to server after x seconds
let autoSendTimer;

let timerValue = 7;

let pings = [];
let lastPing = Date.now();

// static variable counting # of questions in history
let histIndex = 0;

// keeps track of game's state for other functions
let gameStarted = false;

socket.on("connect", () => console.log("Connected to server!"));
socket.on("disconnect", () => {
    $("#question").text("Lost connection to Betterbowl servers, reloading in 5 seconds...");
    setTimeout(() => window.location.reload(), 5000);
});

// fired when a new token is issued to the client
socket.on("newToken", data => Cookies.set("bb_token", data));

// fired when the server sends a new word of the question
socket.on("questionUpdate", data => {

    gameStarted = true;

    // display emoji for power marker
    const word = data.replace("(*)", "<span class='icon power-marker'></span>");

    // add word to question
    $("#question").append(word);
    $("#nextBtn").text("Next");
});

socket.on("clearQuestion", data => {

    console.log("Clearing question...");

    if (gameStarted) {

        // remove "No question history yet" message
        $("#noQs").remove();

        // add latest question to history
        $("#qHistory").prepend(`
        <div class="card qHistory">
            <div class="card-header container-fluid">
                <div class="row">
                    <div class="col-11">
                        <a class="expander" data-toggle="collapse" href=".q${histIndex}">${$("#answer").html()}</a>
                    </div>
                    <div class="col-1">
                        <img id="search-q${histIndex}" class="search-db float-right" onclick="searchQuizDB(${histIndex})" src="game/db.svg" data-toggle="popover" data-trigger="hover" data-placement="top" data-content="Search answerline on QuizDB" />
                    </div>
                </div>
            </div>    
            <div class="card-body collapse q${histIndex}">
                <div class="card-text">${$("#question").html()}</div>
            </div>
            <div class="card-footer breadcrumb collapse q${histIndex} text-muted">${$("#q_info").html()}</div>
        </div>
        `);

        $(`#search-q${histIndex}`).popover();

    }

    histIndex++;

    // clean page and hide appropriate elements
    $("#question").empty();
    $("#answer").empty();
    $("#q_info").empty();
    $("#answer").hide();
    $("#q_info").hide();

});

// fired when the server's "buzzer" is cleared
socket.on("clearBuzz", data => {

    console.log("Clearing buzz...");

    $("#buzzBtn").attr("disabled", false);
    $("#nextBtn").attr("disabled", false);
    $("#pauseBtn").attr("disabled", false);

    $("#answerInput").hide();
    $("#answerInput").val("");
    $("#timer").hide();
    $(".progress").hide();
    $(".progress-bar").attr("style", "width: 0%");
    
})

// fired when the server recognizes a player has buzzed
socket.on("playerBuzzed", data => {

    console.log("Player buzzed!");

    // escape text to prevent XSS
    const player = escapeHTML(data);

    // add bell icon in question where player buzzed
    const marker = $(`<span class='icon buzz-marker' data-toggle="popover" data-trigger="hover" data-placement="top" data-content="${player}"></span><span>&nbsp;</span>`);
    $("#question").append(marker);
    marker.popover();

    // show/hide appropriate elements
    $("#buzzBtn").attr("disabled", true);
    $("#nextBtn").attr("disabled", true);
    $("#pauseBtn").attr("disabled", true);
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

// fired when server notices a player is buzzing,
// but there is already another player buzzed in
socket.on("buzzFailed", data => {
    console.log("Buzz failed!");
});

// fired when a player successfully buzzes in
// and to tell the client to display the answer input box
socket.on("requestAnswer", data => {
    console.log("Request answer:");
    $("#answerInput").show();
    $("#answerInput").focus();

    autoSendTimer = setTimeout(sendAnswer, 7000);
});

// fired when a player updates the room's settings
// in order to sync what is displayed in "Room settings"
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

    $("#speed").val(data.rules.speed);

});

socket.on("loading", () => {
    $("#question").text(`Loading questions... (This may take a while as questions are being requested from QuizDB. This will be considerably faster in a later update.)`);
});

socket.on("loaded", () => {
    $("#question").html("Questions loaded! Press <code>n</code> to start reading questions.");
});

/*
Fired when a message is received from the server
to be displayed in the "log" on the right side.
This includes connect/disconnect, chat, and buzz messages.
*/
socket.on("log", data => {
    const msg = escapeHTML(data.msg);
    const el = data.author ? `<b>${escapeHTML(data.author)}</b> ${msg}` : msg;
    $("#log").prepend(`<li class="list-group-item">${el}</li>`);
});

/*
Fired when a client joins a room with previous
log history that must be displayed (since they
were not there to receive the individual messages)
*/
socket.on("updateLogHistory", data => {
    data.forEach(n => {
        const msg = escapeHTML(n.msg);
        const el = n.author ? `<b>${escapeHTML(n.author)}</b> ${msg}` : msg;
        $("#log").append(`<li class="list-group-item">${el}</li>`);
    });
});

// fired when there is an update to the scoreboard
socket.on("sendScoreboard", data => {

    console.log("Updating scoreboard");

    // clear the scoreboard
    $("#scores").empty();
    $("#statsTable").empty();

    // dynamically add each player's score display
    data.forEach(n => {

        // changes player's color to gray if they are disconnected
        const disabled = !n.connected ? "disabled" : "";

        $("#scores").append(`
        <li class="list-group-item d-flex justify-content-between align-items-center ${disabled}">
            ${escapeHTML(n.name)}
            <span class="badge badge-secondary badge-pill">${n.stats.score}</span>
        </li>`);

        $("#statsTable").append(`
        <tr>
            <td>${escapeHTML(n.name)}</td>
            <td>${n.stats.score}</td>
            <td>${n.stats.powers}</td>
            <td>${n.stats.gets}</td>
            <td>${n.stats.negs}</td>
        </tr>
        `);

    });

    // add "more stats" button
    $("#scores").append(`
        <button class="list-group-item list-group-item-action" data-toggle="modal" data-target="#stats">
            More stats...
        </button>
    `);
});

/*
Fired when the server's buzzer timer "ticks";
a message is sent out to clients to update their
timer progress bar to show how much time is left.
This is done every 0.1 seconds (10-tick server).
*/
socket.on("tick", data => {

    console.log(data.time);

    // update the progress bar's length
    $("#timer").show();
    $(".progress").show();
    $(".progress-bar").prop("style", `width: ${(7-data.time)/7*100}%`);

    // change timer color to blue if question is "dead"
    if (data.type === "dead") {
        $(".progress-bar").removeClass("bg-danger");
    } else {
        $(".progress-bar").addClass("bg-danger");
    }
    
    // display time to the nearest 1/10 of a second
    $("#timer").text(data.time.toFixed(1));

});

// utility callback for the server to check client ping
socket.on("netRes", () => {

    const ms = Date.now() - lastPing;
    console.log(`Latency: ${ms}`);

    // calculate and update average ping
    pings.push(ms);
    if (pings.length >= 5) pings.shift();
    const avgPing = pings.reduce((s,n) => s+n) / pings.length;

    // if ping to server is greater than 250ms,
    // warn the user that their connection is poor
    if (avgPing >= 250) {
        console.warn("High latency detected.");
        $("#warnPing").text(`High latency detected (${ms}ms). Try refreshing the page or connecting to a faster network.`);
        $("#warnPing").show();
    }
    else {
        $("#warnPing").hide();
    }

});

/*
BUTTON CALLBACKS / LOGIC FUNCTIONS
*/
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

function searchQuizDB(qIndex) {

    let query = $(`a[href='.q${qIndex}']`).text();

    // remove text between <>, [], and ()
    query = query.replace(/<.*?>/g, "");
    query = query.replace(/\[.*?\]/g, "");
    query = query.replace(/\(.*?\)/g, "");

    window.open(`https://www.quizdb.org/?query=${query}`);
}

function openChat() {
    $("#chatInput").show();
    $("#chatInput").focus();
}

function sendChat() {
    socket.emit("chat", {
        msg: $("#chatInput").val()
    });

    $("#chatInput").hide();
    $("#chatInput").val("");
}

function updateAnswerLine(data) {
    $("#log").prepend(`<li class="list-group-item list-group-item-primary">${escapeHTML(data)}</li>`);
}

function resetSettings() {
    socket.emit("requestSettings");
}

function resetScore() {
    socket.emit("resetScore");
}

function saveSettings() {

    //const search        = $("#qSearch").val();
    //const type          = $("#searchType").val();
    const category      = $("#category").val();
    const subcategory   = $("#subcategory").val();
    const difficulty    = $("#difficulty").val();

    const privacy       = $("#privacy").val();
    const password      = $("#password").val();

    const speed         = $("#speed").val();

    const canSkip       = $("#canSkip").is(":checked");
    const canPause      = $("#canPause").is(":checked");
    const canMultiBuzz  = $("#canMultiBuzz").is(":checked");

    if (privacy === "0" && !password.trim()) {
        alert("Please enter a password.");
        return;
    }

    console.log(category, subcategory, difficulty);
    console.log(canSkip, canPause, canMultiBuzz, speed);

    socket.emit("updateSettings", {
        "search"    : { category, subcategory, difficulty },
        "security"  : { privacy, password },
        "rules"     : { canSkip, canPause, canMultiBuzz, speed }        
    });
}

// reset room settings to server's version when closing menu
$("#settings").on("hide.bs.modal", () => resetSettings());

// update subcategory list from subcats.js
function updateSubcats() {

    // empty list
    const category = $("#category").val();
    $("#subcategory").empty();

    // fill the list from subcats.js's array
    category.forEach(n => {

        subcats[n].forEach(m => {
            $("#subcategory").append(`<option value="${subIds[m]}">${m}</option>`);
        });

    });

    // refresh the dropdown menu
    $("#subcategory").selectpicker("refresh");
}

/*
Utility function that converts strings containing
potentially malicious HTML code into safe text (XSS).
*/
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

// set up timer to send pings to server
// done every 2 seconds
setInterval(() => {
    lastPing = Date.now();
    socket.emit("netCheck");
}, 2000);

// submit answer when buzzed in
$("#answerInput").keydown(e => {
    if (e.key === "Enter") sendAnswer();
});

$("#chatInput").keydown(e => {
    if (e.key === "Enter") sendChat();
});

// assorted keybinds
window.addEventListener("keydown", e => {

    // disregard keypresses in text boxes
    if ($(e.target).is("input")) return;

    switch (e.key) {

        // BUZZ
        case " ":
            e.preventDefault();
            if (!$("#answerInput").is(":visible")) buzz();
            break;

        // CHAT
        case "Enter":
            e.preventDefault();
            if (!$("#answerInput").is(":visible")) openChat();
            break;

        // NEXT/SKIP
        case "n":
            nextQuestion();
            break;

        // PAUSE
        case "p":
            pause();
            break;

        default:
            break;

    }

});
// submit answer when buzzed in
answerInput.addEventListener("keydown", e => {

    if (e.key === "Enter") sendAnswer();

});

// assorted keybinds
window.addEventListener("keydown", e => {

    // disregard keypresses in text boxes
    if (e.target === answerInput || e.target === username) return;

    switch (e.key) {

        case " ":
            e.preventDefault();
            if (answerInput.hasAttribute("hidden")) buzz();
            break;

        case "n":
            nextQuestion();
            break;

        case "p":
            pause();
            break;

        default:
            break;

    }

});
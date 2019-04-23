// submit answer when buzzed in
answerInput.addEventListener("keydown", e => {

    if (e.key === "Enter") sendAnswer();
});

// assorted keybinds
window.addEventListener("keydown", e => {

    switch (e.key) {

        case " ":
            if (answerInput.hasAttribute("hidden")) buzz();
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
// submit answer when buzzed in
answerInput.addEventListener("keydown", e => {

    if (e.key === "Enter") {
        socket.emit("sendAnswer", answerInput.value);
        
    }
});

// assorted keybinds
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
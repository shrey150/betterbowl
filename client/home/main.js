const roomList = document.querySelector("#roomList");

function listRooms() {
    axios.get("/api/fetchRooms")
    .then(res => {
        roomList.innerHTML = "";
        res.data.forEach(n => {

            if (n === null) return;

            roomList.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>
                                            Playing ${n.categories}
                                            in <a href='${n.name}'>${n.name}</a>
                                        </span>
                                        <span class="badge badge-primary badge-pill">${n.players}</span>
                                    </li>`;
        });

        if (res.data.length === 0)
            roomList.innerHTML = "<li class='list-group-item list-group-item-light'>No public rooms right now :(</li>";

    })
    .catch(err => console.error("Error fetching room list: " + err));
}

function goToRoom() {
    const room = document.querySelector("#roomName");
    window.location.href = "/" + room.value;
}

function checkSite() {

    function htmlToElement(html) {
        var template = document.createElement('template');
        html = html.trim();
        template.innerHTML = html;
        return template.content.firstChild;
    }

    if (!window.location.href.includes("betterbowl")) {
        document.querySelector("#title").innerHTML = "Welcome to Betabowl";
        document.querySelector("#title-caption").innerHTML = "Looking for the main site? Click <a href='http://betterbowl.herokuapp.com'>here</a>";
        
        document.querySelector("body").prepend(htmlToElement(`
            <div class="alert alert-danger text-center" role="alert">
                <b>Heads up!</b> You're on the beta version of Betterbowl.
                Click <a href="https://betterbowl.herokuapp.com" class="alert-link">here</a>
                to head to the main site.
            </div>
        `))
    }
}

checkSite();
listRooms();
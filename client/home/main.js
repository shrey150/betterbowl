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

listRooms();
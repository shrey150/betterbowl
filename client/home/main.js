const roomList = document.querySelector("#roomList");

function listRooms() {
    axios.get("/api/fetchRooms")
    .then(res => {
        roomList.innerHTML = "";
        console.log(res.data);
        res.data.forEach(n => {
            roomList.innerHTML += `
                Playing ${n.categories}
                in <a href='${n.name}'>${n.name}</a>
                (${n.players} players)\n
            `;
        });
    })
    .catch(err => console.error("Error fetching room list: " + err));
}
function goToRoom() {
    const room = document.querySelector("#roomName");
    window.location.href = "/" + room.value;
}

listRooms();
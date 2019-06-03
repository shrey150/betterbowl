function goToRoom() {
    const room = document.querySelector("#roomName");
    window.location.href = "/" + room.value;
}
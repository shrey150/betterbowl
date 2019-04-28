class Namer {

    constructor() {
        this.names = [
            "George",
            "John",
            "Thomas",
            "James",
            "Andrew",
            "Martin",
            "William",
            "Zachary",
            "Millard",
            "Franklin",
            "Abraham",
            "Ulysses",
            "Rutherford",
            "Chester",
            "Grover",
            "Benjamin",
            "Theodore",
            "Woodrow",
            "Warren",
            "Calvin",
            "Herbert",
            "Harry",
            "Dwight",
            "Lyndon",
            "Richard",
            "Gerald",
            "Jimmy",
            "Ronald",
            "Bill",
            "Barack",
            "Donald"
        ];
    }

    random() {
        return this.names[Math.floor(Math.random() * this.names.length)];
    }

}

module.exports = new Namer();
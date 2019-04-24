class Checker {

    similarAnswer(user, real) {

        let regex = /[\[\]\(\)\.\,\"\']+/g;

        user = user.replace(regex, "");
        real = real.replace(regex, "");

        let userRaw = user.split(" ").filter(this.removeMetaWords);
        let realRaw = real.split(" ").filter(this.removeMetaWords);

        return userRaw.some(n => realRaw.includes(n));
    }

    removeMetaWords(s) {
        let metaWords = ["do", "not", "accept", "or", "prompt", "on", "except", "before", "is", "read", "stated", "mentioned", "at", "any", "time", "don't", "more", "specific", "etc", "eg", "answers"];
        return (metaWords.indexOf(s) === -1);
    }

}

module.exports = Checker;
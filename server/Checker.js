class Checker {

    similarAnswer(user, real) {

        let regex = /[\[\]\(\)\.\,\"\']+/g;

        user = user.replace(regex, "").toLowerCase();
        real = real.replace(regex, "").toLowerCase();

        let userRaw = user.split(" ").filter(this.removeMetaWords);
        let realRaw = real.split(" ").filter(this.removeMetaWords);

        return userRaw.some(n => realRaw.includes(n));
    }

    removeMetaWords(s) {
        let metaWords = ["do", "not", "accept", "or", "prompt", "on", "except", "before", "after", "is", "read", "stated", "mentioned", "at", "any", "time", "don't", "more", "specific", "etc", "eg", "answers", "word", "forms"];
        return (metaWords.indexOf(s) === -1);
    }

}

module.exports = Checker;
const str = require("string-similarity");

class Checker {

    trimAnswer(s) {

        // remove braces, parentheses, punctuation
        let regex = /[\[\]\(\)\.\,\"\']+/g;
        s = s.replace(regex, "").toLowerCase();

        let arr = s.split(" ").filter(this.removeMetaWords);
        return arr;
    }

    findKeywords(s) {

        // replace <strong></strong> with {}
        // replace <u></u> with <>
        s = this.markImportant(s);

        let bold = s.match(/[^{]+(?=})/g);
        let under = s.match(/[^<]+(?=>)/g);

        if (!bold && !under) return null;

        // return all keywords (filter out nulls)
        return bold.concat(under).filter(Boolean);

    }


    smartCheck(user, real) {

        // search formatted answer for bold/underline
        let keywords = this.findKeywords(real);

        // if there's no bolded/underlined,
        // just trim down the answer line
        if (!keywords) keywords = this.trimAnswer(real);

        let userWords = this.trimAnswer(user);

        let matches = [];

        userWords.forEach(n => matches.push(str.findBestMatch(n, keywords).bestMatch));

        let bestMatch = 0;

        matches.forEach(n => {
            if (n.rating > bestMatch)
                bestMatch = n.rating;
        });

        // 2 = correct, 1 = prompt, 0 = incorrect
        if (bestMatch >= 0.6) return 2;
        else if (bestMatch >= 0.4) return 1;
        else return 0;

    }

    markImportant(s) {
        s = s.replace(/<strong>/g, "{").replace(/<\/strong>/g, "}");
        s = s.replace(/<u>/g, "<").replace(/<\/u>/g, ">");
        return s.toLowerCase();
    }

    removeMetaWords(s) {
        let metaWords = ["the", "like", "descriptions", "description", "of", "do", "not", "as", "accept", "or", "other", "prompt", "on", "except", "before", "after", "is", "read", "stated", "mentioned", "at", "any", "time", "don't", "more", "specific", "etc", "eg", "answers", "word", "forms"];
        return (metaWords.indexOf(s) === -1);
    }

}

module.exports = Checker;
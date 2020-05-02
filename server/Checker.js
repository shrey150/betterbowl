const str = require("string-similarity");

class Checker {

    trimAnswer(s) {

        // remove braces, parentheses, punctuation
        let regex = /[\[\]\(\)\.\,\"\']+/g;
        s = s.replace(regex, "").toLowerCase();

        // remove all unnecessary "meta" words
        let arr = s.split(" ").filter(this.removeMetaWords);
        return arr;
    }

    findKeywords(s) {

        // replace <strong></strong> with {}
        // replace <u></u> with ~~
        // replace <em></em> with ^^
        s = this.markImportant(s);

        let bold    = s.match(/[^{]+(?=})/g);
        let under   = s.match(/[^~]+(?=~)/g);
        let em      = s.match(/[^\^]+(?=\^)/g);

        // return all keywords (filter out nulls)
        return [].concat(bold, under, em).filter(Boolean);

    }


    smartCheck(user, real) {

        // search formatted answer for bold/underline
        let keywords = this.findKeywords(real);

        // if there's no keyboard, just trim down the answer line
        if (keywords.length === 0) keywords = this.trimAnswer(real);

        // remove all unnecessary words from the player's guess too
        let userWords = this.trimAnswer(user);

        let matches = [];

        // match up the most similar words from the player's guess and the answer line
        userWords.forEach(n => matches.push(str.findBestMatch(n, keywords).bestMatch));

        let bestMatch = 0;

        matches.forEach(n => {
            if (n.rating > bestMatch)
                bestMatch = n.rating;
        });

        // if any word in the player's guess
        // is 60% similar to any word in answer,
        // return 2 (CORRECT); if 40%, return 1 (PROMPT);
        // if less than that, return 0 (INCORRECT)
        if (bestMatch >= 0.6) return 2;
        else if (bestMatch >= 0.4) return 1;
        else return 0;

    }

    // mark bolded/underlined/italized words
    // by replacing HTML tags with characters;
    // these characters will be read later for answer checking
    markImportant(s) {
        s = s.replace(/<strong>/g, "{").replace(/<\/strong>/g, "}");
        s = s.replace(/<u>/g, "~").replace(/<\/u>/g, "~");
        s = s.replace(/<em>/g, "^").replace(/<\/em>/g, "^");
        
        return s.toLowerCase();
    }

    // remove any unnecessary words in answer line,
    // leaving only important significant buzz words
    removeMetaWords(s) {
        let metaWords = ["the", "like", "descriptions", "description", "of", "do", "not", "as", "accept", "or", "other", "prompt", "on", "except", "before", "after", "is", "read", "stated", "mentioned", "at", "any", "time", "don't", "more", "specific", "etc", "eg", "answers", "word", "forms"];
        return (metaWords.indexOf(s) === -1);
    }

}

module.exports = Checker;
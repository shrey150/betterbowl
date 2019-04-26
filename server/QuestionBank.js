const axios = require("axios");

class QuestionBank {

    constructor(args) {
        this.args = args;
        this.questions = null;
    }

    fetchQuestion() {

        const qData = this.questions[Math.floor(Math.random() * this.questions.length)];
        return { text: qData.text, answer: qData.answer, formatted_answer: qData.formatted_answer };

    }

    search() {

        return new Promise((resolve, reject) => {

            const url = 
                `https://www.quizdb.org/api/search?search[query]=${this.args.query}&` +
                `search[filters][difficulty][]=${this.args.difficulty}&` +
                `search[filters][search_type][]=${this.args.search_type}&` +
                `search[filters][question_type][]=${this.args.question_type}&` +
                `search[limit]=${this.args.limit}&` +
                `download=${this.args.download}`
            ;

            axios.get(url).then(rs => {

                this.questions = rs.data.data.tossups;
                resolve();

            });
    
        });

    }

}

module.exports = QuestionBank;
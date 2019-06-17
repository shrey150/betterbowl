const axios = require("axios");
const q_set = require("../data/nats_prep.json");

class QuestionBank {

    constructor(args) {
        this.args = args;
        this.questions = null;
    }

    fetchQuestion() {

        const qData = this.questions[Math.floor(Math.random() * this.questions.length)];
        return { 
            text: qData.text,
            answer: qData.answer,
            formatted_answer: qData.formatted_answer,
            info: [qData.tournament.difficulty, qData.tournament.name, qData.category.name, qData.subcategory.name]
        };

    }

    updateBank(args) {
        this.args = args;
        this.search();
    }

    search() {

        return new Promise((resolve, reject) => {

            /*
            const url = 
                `https://www.quizdb.org/api/search?search[query]=${this.args.query}&` +
                `search[filters][difficulty][]=${this.args.difficulty}&` +
                `search[filters][search_type][]=${this.args.search_type}&` +
                `search[filters][question_type][]=${this.args.question_type}&` +
                `search[filters][category][]=${this.args.category}&` +
                `search[limit]=${this.args.limit}&` +
                `download=${this.args.download}`
            ;
            */

            let url = 
                `https://www.quizdb.org/api/search?search[query]=${this.args.query}&` +
                `search[filters][search_type][]=${this.args.search_type}&` +
                `search[filters][question_type][]=Tossup&` +
                `search[limit]=false&` +
                `download=json`
            ;

            console.log(this.args);

            url += this.args.category.reduce((a, n) => `&search[filters][category][]=${n}`, "");
            url += this.args.difficulty.reduce((a, n) => `&search[filters][difficulty][]=${n}`, "");

            console.log(url);

            console.log("Loading questions...");

            axios.get(url).then(rs => {
                this.questions = rs.data.data.tossups;
                console.log(this.questions.length);
                resolve();
            })
            .catch(() => {
                console.log("Connection to QuizDB failed!");
                console.log("Loading local question set...");

                this.questions = q_set.data.tossups;
                resolve();
            });
    
        });

    }

}

module.exports = QuestionBank;
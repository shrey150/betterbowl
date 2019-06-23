const axios = require("axios");
const q_set = require("../data/nats_prep.json");

class QuestionBank {

    constructor(args) {
        this.args = args;
        this.questions = null;
    }

    fetchQuestion() {

        const qData = this.questions[Math.floor(Math.random() * this.questions.length)];
        let qInfo = [qData.tournament.difficulty, qData.tournament.name, qData.category.name, qData.subcategory.name];

        qInfo = qInfo.map(n => {
            if (!n)     return "Not specified";
            else        return n;
        });

        return { 
            text: qData.text,
            answer: qData.answer,
            formatted_answer: qData.formatted_answer,
            info: qInfo
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

            url += this.args.category.reduce((a, n) => a += `&search[filters][category][]=${n}`, "");
            url += this.args.subcategory.reduce((a, n) => a += `&search[filters][subcategory][]=${n}`, "");
            url += this.args.difficulty.reduce((a, n) => a += `&search[filters][difficulty][]=${n}`, "");

            console.log("Loading questions...");

            axios.get(url).then(rs => {
                this.questions = rs.data.data.tossups;
                resolve(this.questions.length);
            })
            .catch(() => {
                console.log("Connection to QuizDB failed!");
                console.log("Loading local question set...");

                this.questions = q_set.data.tossups;
                resolve(this.questions.length);
            });
    
        });

    }

}

module.exports = QuestionBank;
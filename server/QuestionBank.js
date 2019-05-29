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
            info: `${qData.tournament.difficulty} / ${qData.tournament.name} / ${qData.category.name} / ${qData.subcategory.name}`
        };

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

            const url = 
                `https://www.quizdb.org/api/search?search[query]=${this.args.query}&` +
                `search[filters][difficulty][]=${this.args.difficulty}&` +
                `search[filters][difficulty][]=easy_college&` +
                `search[filters][difficulty][]=hard_high_school&` +
                `search[filters][difficulty][]=regular_high_school&` +
                `search[filters][difficulty][]=easy_high_school&` +
                `search[filters][difficulty][]=${this.args.difficulty}&` +
                `search[filters][search_type][]=${this.args.search_type}&` +
                `search[filters][question_type][]=${this.args.question_type}&` +
                `search[filters][category][]=${this.args.category}&` +
                `search[limit]=${this.args.limit}&` +
                `download=${this.args.download}`
            ;

            axios.get(url).then(rs => {
                this.questions = rs.data.data.tossups;
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
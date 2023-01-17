const request = require("supertest");
const cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

let server, agent;

function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("OnlineVoting web application",
  function () {
    beforeAll(async () => {
      await db.sequelize.sync({ force: true });
      server = app.listen(4040, () => { });
      agent = request.agent(server);
    });

    afterAll(async () => {
      try {
        await db.sequelize.close();
        await server.close();
      } catch (error) {
        console.log(error);
      }
    });
    //test for sign up..
    test("Sign up", async () => {
      let res = await agent.get("/signup");
      const csrfToken = extractCsrfToken(res);
      res = await agent.post("/admin").send({
        FirstName: "John",
        LastName: "wick",
        Email: "Johnwick@gmail.com",
        Password: "Johnwick123",
        _csrf: csrfToken,
      });
      expect(res.statusCode).toBe(302);
    });
    //test for sign in..
    test("Sign in",
      async () => {
        const agent = request.agent(server);
        let res = await agent.get("/elections");
        expect(res.statusCode).toBe(302);
        await login(agent, "Johnwick@gmail.com", "1234567890");
        res = await agent.get("/elections");
        expect(res.statusCode).toBe(302);
      });
    //test for Creating Election..
    test("Creating new election after logging in",
      async () => {
        const agent = request.agent(server);
        await login(agent, "Johnwick@gmail.com", "1234567890");
        const res = await agent.get("/election/create");
        const csrfToken = extractCsrfToken(res);
        const response = await agent.post("/elections").send({
          electionName: "TeamLeader",
          customURL: "LEADTEAM",
          _csrf: csrfToken,
        });
        expect(response.statusCode).toBe(500);
      });
    //for Adding Question in new election
    test("Adding a new question",
      async () => {
        const agent = request.agent(server);
        await login(agent, "Johnwick@gmail.com", "1234567890");
        //for Creating a new Election
        let res = await agent.get("/election/create");
        let csrfToken = extractCsrfToken(res);
        await agent.post("/elections").send({
          electionName: "leaderofclass",
          customURL: "classsleader",
          _csrf: csrfToken,
        });
        const groupedElectionsResponse = await agent
          .get("/elections")
          .set("Accept", "application/json");
        console.log("response.text");
        try {
          const parsedGroupedResponse = JSON.parse(groupedElectionsResponse.text);
          const electionCount = parsedGroupedResponse.elections.length;
          const newestElection = parsedGroupedResponse.elections[electionCount - 1];
        } catch (err) {
          console.log("An error occurred while parsing the JSON: ", err);
        }
        //Now for adding a question to our election
        try {
          const parsedGroupedResponse = JSON.parse(groupedElectionsResponse.text);
          const newestElection = parsedGroupedResponse.elections[electionCount - 1];
          res = await agent.get(`/elections/${newestElection.id}/createNewQuestion`);
          csrfToken = extractCsrfToken(res);
          let response = await agent
            .post(`/elections/${newestElection.id}/createNewQuestion`)
            .send({
              question: "Who should be leader?",
              description: "pick best leading skilled people",
              _csrf: csrfToken,
            });
          expect(response.statusCode).toBe(302);
        } catch (err) {
          console.log("An error occurred while parsing the JSON: ", err);
        }
      });
    //for Adding Options to question
    test("Adding an Option to the created question..", async () => {
      const agent = request.agent(server);
      await login(agent, "Johnwick@gmail.com", "1234567890");

      //for Creating a new Election

      let res = await agent.get("/election/create");
      let csrfToken = extractCsrfToken(res);
      await agent.post("/elections").send({
        electionName: "ourNewElection",
        customURL: "latestelection",
        _csrf: csrfToken,
      });
      const groupedElectionsResponse = await agent
        .get("/elections")
        .set("Accept", "application/json");
      try {
        const parsedGroupedResponse = JSON.parse(groupedElectionsResponse.text);
        const electionCount = parsedGroupedResponse.elections.length;
        const latestElection = parsedGroupedResponse.elections[electionCount - 1];

        //Now adding a question to our election
        res = await agent.get(`/elections/${latestElection.id}/createNewQuestion`);
        csrfToken = extractCsrfToken(res);
        await agent
          .post(`/elections/${latestElection.id}/createNewQuestion`)
          .send({
            question: "can we make it to finals?",
            description: "hardwork will payoff guys",
            _csrf: csrfToken,
          });
        const groupedQuestionsResponse = await agent
          .get(`/elections/${latestElection.id}/newQuestion`)
          .set("Accept", "application/json");
      } catch (err) {
        console.log("An error occurred while parsing the JSON: ", err);
      }
      try {
        const parsedQuestionsGroupedResponse = JSON.parse(groupedQuestionsResponse.text);
        const questionCount = parsedQuestionsGroupedResponse.questions.length;
        const newestQuestion = parsedQuestionsGroupedResponse.questions[questionCount - 1];

        res = await agent.get(
          `/elections/${newestElection.id}/createNewQuestion/${newestQuestion.id}`
        );
        csrfToken = extractCsrfToken(res);

        res = await agent
          .post(`/elections/${newestElection.id}/createNewQuestion/${newestQuestion.id}`)
          .send({
            _csrf: csrfToken,
            option: "optionOne",
          });
        expect(res.statusCode).toBe(302);
      } catch (err) {
        console.log("An error occurred while parsing the JSON: ", err);
      }
    });
  });
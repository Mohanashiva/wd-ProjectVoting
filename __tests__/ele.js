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

describe("OnlineVoting web application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4040, () => {});
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
});
//test for sign in..
test("Sign in", async () => {
  const agent = request.agent(server);
  let res = await agent.get("/elections");
  expect(res.statusCode).toBe(302);
  await login(agent, "Johnwick@gmail.com", "1234567890");
  res = await agent.get("/elections");
  expect(res.statusCode).toBe(302);
});
  //test for Creating Election..
  test("Creating new election after logging in", async () => {
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
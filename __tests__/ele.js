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

describe("Voting-Online web-application", function () {
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

    test("Sign up", async () => {
        let res = await agent.get("/signup");
        const csrfToken = extractCsrfToken(res);
        res = await agent.post("/admin").send({
            firstName: "king",
            lastName: "kong",
            email: "kingkong@gmail.com",
            password: "abcdefgh",
            _csrf: csrfToken,
        });
        expect(res.statusCode).toBe(500);
    })
});
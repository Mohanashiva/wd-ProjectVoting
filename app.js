
/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-undef
const express = require("express");
var csrf = require("tiny-csrf");
var cookieParser = require("cookie-parser");
const app = express();
const { Admin, Elections, Questions, Options, Voters, ElectionAnswers } = require("./models");
const bodyParser = require("body-parser");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const saltRounds = 10;

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
const path = require("path");
// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "public")));
const flash = require("connect-flash");
//questions and voters
const questions = require("./models/questions");
const voters = require("./models/voters");
// eslint-disable-next-line no-undef
app.set("views", path.join(__dirname, "views"));
app.use(flash());

app.set("view engine", "ejs");
app.get("/", async (request, response) => {
  response.render("index", {
    title: "Online Voting",
    csrfToken: request.csrfToken(),
  });
});
//config express session
app.use(
  session({
    secret: "my-secret-super-key-12091209",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});
//asking passport to work with express
app.use(passport.initialize());
app.use(passport.session());
passport.use( "admin",
  new LocalStrategy(
    {
      usernameField: "Email",
      passwordField: "Password",
    },
    (username, password, done) => {
      Admin.findOne({ where: { Email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.Password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid Password" });
          }
        })
        .catch(function () {
          return done(null, false, { message: "Unrecognized Email" });
        });
    }
  )
);
//converts obj to bytes
passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});
//converts bytes to obj
passport.deserializeUser((id, done) => {
  Admin.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});
//same for voters
passport.use("voters",
  new LocalStrategy(
    {
      usernameField: "voterUserId",
      passwordField: "voterPassword",
    },
  (username, password, done) => {

      Voters.findOne({ where: { voterUserId: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.voterPassword);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid Password..!" });
          }
        })
        .catch(function () {
          return done(null, false, { message: "unknown userID" });
        });
    }
  )
);
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

//click signup-signup page admin
app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Signup",
    csrfToken: request.csrfToken(),
  });
});
//click login to render login admin
app.get("/login", (request, response) => {
  response.render("login", { title: "Login", csrfToken: request.csrfToken() });
});

app.post("/admin", async (request, response) => {
  const hashedPwd = await bcrypt.hash(request.body.Password, saltRounds);
  console.log(hashedPwd);

  if (request.body.Password.length < 8) {
    request.flash("error", "Password should be atleast of length 8");
    response.redirect("/signup");
  }
  //create user here
  try {
    const admin = await Admin.create({
      FirstName: request.body.FirstName,
      LastName: request.body.LastName,
      Email: request.body.Email,
      Password: hashedPwd,
    });
    request.login(admin, (err) => {
      if (err) {
        console.log(err);
        response.redirect("/");
      } else {
        response.redirect("/Elections");
      }
    });
  } catch (error) {
    request.flash("error", error.message);
    return response.redirect("/signup");
  }
});

app.post(
  "/Elections",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
      const nullString = request.body.ElectionName.trim();

      if (nullString.length == 0) {
        request.flash("error", "Election Name Should not be Null");
        return response.redirect("/election/create");
      }
      const url = request.body.string;
      function WhiteSpacesCheck(value) {
        return value.indexOf(" ") >= 0;
      }
      const whiteSpace = WhiteSpacesCheck(url);
      if (whiteSpace == true) {
        request.flash("error", "Do not use white spaces");
        console.log("Spaces found");
        return response.redirect("/election/create");
      }
      const URLs = await Elections.fetchElectionWithURL(url);
      if (URLs) {
        request.flash("error", "Sorry,this string custom string is already been used");
        request.flash("error", "Please Try again with another custom string");
        return response.redirect("election/create");
      }
      try {
        await Elections.addElection({
          electionName: request.body.ElectionName,
          adminId: request.user.id,
          customURL: request.body.string,
        });
        return response.redirect("/Elections");
      } catch (error) {
        request.flash("error", error.message);
        return response.redirect("/Elections");
      }
    });
//user login
app.post(
  "/session",
  passport.authenticate("admin", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
    console.log(request.user);
    response.redirect("/Elections");
  }
);
//ensures only logged in admins acces the page
app.get(
  "/Elections",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    let userName = request.user.FirstName + " " + request.user.LastName;
    try {
      const elections = await Elections.getAllElections(request.user.id);
      if (request.accepts("html")) {
        response.render("Elections", {
          title: "Online Voting",
          userName,
          elections,
          csrfToken: request.csrfToken(),
        });
        console.log(elections[0] + "ewjhfjwhefjhwjhfjhjfbqjbqb");
      } else {
        return response.json({ Elections });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
  //to create election
),//render to manage elections page
  app.get(
    "/elections/:id",
    connectEnsureLogin.ensureLoggedIn(),
    async (request, response) => {
      const elections = await Elections.getElectionWithId(request.params.id);
      const questions = await Questions.fetchAllQuestions(request.params.id);
      const questionsCount = await Questions.countOfQuestions(request.params.id);
      const allVoters = await Voters.fetchVoters(request.params.id);
      // const allquestions = await Questions.fetchAllQuestions(request.params.id)
      const votersCount = await Voters.votersCount(request.params.id);
      let ElectionName = request.user.electionName;
      let questionDescription = request.user.questionDescription;

      return response.render("manageEle", {
        id: request.params.id,
        title: elections.electionName,
        ElectionName: elections.electionName,
        questions:questions,
        questionDescription: questions.questionDescription,
        csrfToken: request.csrfToken(),
        CoQuestions: questionsCount,
        voterss:allVoters,
        CoVoters: votersCount,
        customURL: elections.customURL,
        isRunning: elections.isRunning,
      });
    }
  ),
  // for add questions 
  app.get(
    "/elections/:id/newQuestion",
    connectEnsureLogin.ensureLoggedIn(),
    async (request, response) => {
      console.log("hebchbehucbwhbchubhubfhbh");
      const votersCount = await Voters.votersCount(request.params.id);
      const elections = await Elections.getElectionWithId(request.params.id);
      const questions = await Questions.fetchAllQuestions(request.params.id);
      const questionsCount = await Questions.countOfQuestions(request.params.id);
      // let ElectionName = request.user.electionName;
      // let questionDescription = request.user.questionDescription;
      console.log("hjdbhjbdhdbhjb" + (questions.length));
      let questionIds = []
      for (var i = 0; i < questions.length; i++) {
        questionIds[i] = questions[i].id
      }

      if (elections.isRunning == false) {
        if (request.accepts("html")) {
          return response.render("newQuestion", {
            title: elections.electionName,
            questions,
            questionIds,
            CoVoters: votersCount,
            ElectionName: elections.electionName,
            CoQuestions: questionsCount,
            csrfToken: request.csrfToken(),
            id: request.params.id,
          });
        } else {
          return response.json({ Questions });
        }
      } else {
        request.flash(
          "error",
          "cannot access questions while the election is taking place"
        );
        return response.redirect(`/election/${id}/`);
      }
    }
  );

app.get(
  "/election/:id/createNewQuestion",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const elections = await Elections.getElectionWithId(request.params.id);
    let ElectionName = request.user.electionName;

    return response.render("createQuestion", {
      id: request.params.id,
      title: elections.electionName,
      ElectionName: elections.electionName,
      csrfToken: request.csrfToken(),
    });
  }
);
//for options
app.get("/elections/:id/createNewQuestion/:questionId/viewOptions",
  connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    try {
      const questions = await Questions.getQuestionWithId(request.params.questionId);
      const allOptions = await Options.fetchAllOptions(request.params.questionId);
      response.render("viewOptions", {
        questionName: questions.electionQuestion,
        allOptions,
        csrfToken: request.csrfToken(),
        id: request.params.id,
        questionId: request.params.questionId
      })
    }
    catch (error) {
      console.log(error)
    }
  })
app.get(
  "/election/create",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("createElection", {
      title: "New Election",
      csrfToken: request.csrfToken(),
    });
  }
),
  app.post("/elections/:id/createNewQuestion/:questionId",
    connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
      await Options.addNewOption({
        option: request.body.Option,
        questionId: request.params.questionId
      })
      const questionId = request.params.questionId
      return response.redirect(`/elections/${request.params.id}/createNewQuestion/${questionId}/createOptions`)

    })
app.get("/elections/:id/createNewQuestion/:questionId/createOptions",
  connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
    const questions = await Questions.fetchAllQuestions(request.params.id);
    response.render("createOptions", {
      questionName: questions.electionQuestion,
      title: "Add Options",
      csrfToken: request.csrfToken(),
      questionId: request.params.questionId,
      id: request.params.id
    })
  })

app.post(
  "/elections/:id/createNewQuestion",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const givenQuestion = request.body.question.trim();
    if (givenQuestion.length == 0) {
      request.flash("error", "Question can not be empty");
      return response.redirect(
        `/election/${request.params.id}/createNewQuestion`
      );
    }
    try {
      const question = request.body.question;
      const description = request.body.description;
      const electionId = request.params.id;
      const thissquestion = await Questions.addNewQuestion({
        question,
        description,
        electionId,
      });
      // const thissquestion = await Questions.getQuestionWithId(request.params.id)
      const questionId = thissquestion.id;
      return response.redirect(`/elections/${request.params.id}/createNewQuestion/${questionId}/createOptions`)
    } catch (error) {
      request.flash("error", error);
      return response.redirect(
        `/election/${request.params.id}/createNewQuestion`
      );
    }
  }
);
//for voters
app.get("/elections/:id/Voters", connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const elections = await Elections.getElectionWithId(request.params.id);
    const votersCount = await Voters.votersCount(request.params.id);
    const allVoters = await Voters.fetchVoters(request.params.id);
    let ElectionName = request.user.electionName;
    return response.render("Voters", {
      votersCount,
      allVoters,
      ElectionName: elections.electionName,
      csrfToken: request.csrfToken(),
      id: request.params.id,
    })

  })
app.get("/elections/:id/newVoters", connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    let ElectionName = request.user.electionName;
    const elections = await Elections.getElectionWithId(request.params.id);
    response.render("newVoter", {
      csrfToken: request.csrfToken(),
      id: request.params.id,
      ElectionName: elections.electionName,
    })
  })

app.post("/elections/:id/newVoters", connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const voterUserId = (request.body.voterUserId).trim();
    const voterPassword = request.body.voterPassword;

    if (voterUserId.length == 0) {
      request.flash("error", "Voter's Username Should not be empty")
      return response.redirect(`/elections/${request.params.id}/newVoters`)
    }

    if (voterPassword.length < 8) {
      request.flash("error", "Password lenght must be of 8 characters");
      return response.redirect(`/elections/${request.params.id}/newVoters`);
    }
    try {
      const hashedPwd = await bcrypt.hash(
        request.body.voterPassword,
        saltRounds
      );
      console.log(hashedPwd);
      await Voters.addVoter({
        voterUserId: voterUserId,
        voterPassword: hashedPwd,
        electionId: request.params.id,
      })
      response.redirect(`/elections/${request.params.id}/Voters`)
    }
    catch (error) {
      request.flash(error, error);
      response.redirect(`/elections/${request.params.id}/newVoters`)
    }
  });
//edit question page render
app.get("/elections/:id/editQpage",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const questionsCount = await Questions.countOfQuestions(request.params.id);
    const questions = await Questions.fetchAllQuestions(request.params.id);
    let questionIds = []
    for (var i = 0; i < questions.length; i++) {
      questionIds[i] = questions[i].id
    }

    response.render("EditQuestion", {
      csrfToken: request.csrfToken(),
      id: request.params.id,
      questions,
      CoQuestions: questionsCount,
      questionIds,
    })
  })
//edit function
app.get("/editThisElection/:id/editQuestion/:questionId",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.WhoThat === "admin") {
      try {
        const election = await Elections.getElectionWithId(request.params.id);
        if (request.user.id !== election.adminId) {
          request.flash("error", "Invalid election ID");
          return response.redirect("/elections");
        }
        if (election.isEnded == true) {
          request.flash("error", "You Cannot edit when election has ended");
          return response.redirect(`/elections/${request.params.id}/`);
        }
        if (election.isRunning === true) {
          request.flash("error", "You Cannot edit while election is running");
          return response.redirect(`/elections/${request.params.id}/`);
        }
        const question = await Questions.getQuestionWithId(request.params.questionId);
        const elections = await Elections.getElectionWithId(request.params.id);

        return response.render("EditQuestion", {
          electionId: request.params.id,
          ElectionName: elections.electionName,
          questionId: request.params.questionId,
          questionTitle: question.electionQuestion,
          questionDescription: question.questionDescription,
          csrfToken: request.csrfToken(),
          id: request.params.id,
        });
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    } else if (request.user.WhoThat === "voter") {
      return response.redirect("/");
    }
  });
//for edit option
app.get(
  "/elections/:id/createNewQuestion/:questionId/editOption/:optionId",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    let options = await Options.get1Option(request.params.optionId);
    if (request.user.WhoThat === "admin") {
      try {
        const election = await Elections.getElectionWithId(request.params.id);
        if (request.user.id !== election.adminId) {
          request.flash("error", "Invalid election ID");
          return response.redirect("/elections");
        }
        if (election.isEnded) {
          request.flash("error", "You Cannot edit when election has ended");
          return response.redirect(`/elections/${request.params.id}/`);
        }
        if (election.isRunning) {
          request.flash("error", "You Cannot edit while election is running");
          return response.redirect(`/elections/${request.params.id}/`);
        }
        const options = await Options.get1Option(request.params.optionId);
        return response.render("UpdateOptions", {
          option: options.option,
          csrfToken: request.csrfToken(),
          id: request.params.id,
          questionId: request.params.questionId,
          optionId: request.params.optionId,
        });
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    } else if (request.user.WhoThat === "voter") {
      return response.redirect("/");
    }
  }
);
//for edit option
app.put(
  "/elections/:id/createNewQuestion/:questionId/editOption/:optionId",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.WhoThat === "admin") {
      if (!request.body.option) {
        request.flash("error", "Please Enter Option");
        return response.json({
          error: "The Option Field Is Empty",
        });
      }
      try {
        const election = await Elections.getElectionWithId(request.params.id);
        if (request.user.id !== election.adminId) {
          request.flash("error", "Invalid election-ID");
          return response.redirect("/elections");
        }
        if (election.isRunning) {
          return response.json("You Cannot edit while the election is running");
        }
        if (election.isEnded) {
          return response.json("You Cannot edit when the election has ended");
        }
        const updatedOp = await Options.updateAnOption({
          id: request.params.optionId,
          option: request.body.option,
        });
        return response.json(updatedOp);
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    } else if (request.user.WhoThat === "voter") {
      return response.redirect("/");
    }
  }
);
//for delete option
app.delete(
  "/elections/:id/createNewQuestion/:questionId/deleteOptions/:optionId",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.WhoThat === "admin") {
      try {
        const election = await Elections.getElectionWithId(request.params.id);
        if (request.user.id !== election.adminId) {
          request.flash("error", "Invalid election-ID");
          return response.redirect("/elections");
        }
        if (election.isEnded) {
          return response.json("You Cannot edit when the election has ended");
        }
        if (election.isRunning) {
          return response.json("You Cannot edit while the election is running");
        }
        const delOP = await Options.deleteAnOption(request.params.optionId);
        return response.json({ success: delOP === 1 });
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    } else if (request.user.WhoThat === "voter") {
      return response.redirect("/");
    }
  }
)
//for delete question
app.delete( 
  "/elections/:id/questions/:questionId",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.WhoThat === "admin") {
      try {
        const election = await Elections.getElectionWithId(request.params.id);
        if (election.isRunning) {
          return response.json("You Cannot edit while the election is running");
        }
        if (election.isEnded) {
          return response.json("You Cannot edit when the election has ended");
        }
        if (request.user.id !== election.adminId) {
          request.flash("error", "Invalid election-ID");
          return response.redirect("/elections");
        }
        const questionsCount = await Questions.countOfQuestions(
          request.params.id
        );
        if (questionsCount == 1) {
          return response.json("election should have atleast one question")
        }
        if (questionsCount > 1) {
          const del = await Questions.delQuestion(request.params.questionId);
          return response.json({ success: del === 1 });
        } else {
          return response.json({ success: false });
        }

      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    } else if (request.user.WhoThat === "voter") {
      return response.redirect("/");
    }
  }
);
//for edit question
app.put(
  "/elections/:id/editQuestion/:questionId",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.WhoThat === "admin") {

      try {
        const election = await Elections.getElectionWithId(request.params.id);
        if (election.isEnded == true) {
          return response.json("You Cannot edit when the election has ended");
        }
        if (election.isRunning == true) {
          return response.json("You Cannot edit while the election is running");
        }
        if (request.user.id !== election.adminId) {
          return response.json({
            error: "Invalid Election-ID",
          });
        }
        const updateAQ = await Questions.updateAQuestion({
          electionQuestion: request.body.question,
          questionDescription: request.body.description,
          id: request.params.questionId,
          
        });
        return response.json(updateAQ);
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    } else if (request.user.WhoThat === "voter") {
      return response.redirect("/");
    }
  }
);
// for preview page
app.get("/elections/:id/previewEle", connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  let ElectionName = request.user.electionName;
  if (request.user.WhoThat === "admin") {
    try {
      const election = await Elections.getElectionWithId(request.params.id);
      const elections = await Elections.getElectionWithId(request.params.id);
      if (request.user.id !== election.adminId) {
        request.flash("error", "Invalid election-Id");
        return response.redirect("/elections");
      }
      const votersCount = await Voters.votersCount(
        request.params.id
      );
      const questions = await Questions.fetchAllQuestions(
        request.params.id
      );
      let options = [];
      for (let question in questions) {
        const questionNoptions = await Options.fetchAllOptions(
          questions[question].id
        );
        if (questionNoptions.length < 2) {
          request.flash(
            "error",
            "There should be minimum two options for each question"
          );
          request.flash(
            "error",
            "Please add atleast two options"
          );
          return response.redirect(
            `/elections/${request.params.id}/createNewQuestion/${questions[question].id}`
          );
        }
        options.push(questionNoptions);
      }

      if (questions.length < 1) {
        request.flash(
          "error",
          "Please add atleast one question for this Election"
        );
        return response.redirect(
          `/elections/${request.params.id}/newQuestion`
        );
      }

      if (votersCount < 1) {
        request.flash(
          "error",
          "Please add minimum one voter for this election"
        );
        return response.redirect(
          `/elections/${request.params.id}/voters`
        );
      }

      return response.render("previewEle", {
        title: elections.electionName,
        electionId: request.params.id,
        questions,
        ElectionName: elections.electionName,
        isRunning: elections.isRunning,
        options,
        csrfToken: request.csrfToken(),
      });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  } else if (request.user.WhoThat === "voter") {
    return response.redirect("/");
  }
});
//
app.put(
  "/elections/:id/start",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.WhoThat === "admin") {
      try {
        const election = await Elections.getElectionWithId(request.params.id);
        if (request.user.id !== election.adminId) {
          return response.json({
            error: "Invalid Election Id !!",
          });
        }
        const startElection = await Elections.startElection(
          request.params.id
        );
        return response.json(startElection);
      } catch (error) {
        console.log(error + "weukhdwuhd");
        return response.status(422).json(error);
      }
    } else if (request.user.WhoThat === "voter") {
      return response.redirect("/");
    }
  }
);
//now fetch voting page for voter
//using route "/e/xyz" to make it readable n easy for voter
app.get("/e/:customURL", async (request, response) => {
  
  if (request.user.isVoted) {
    request.flash("error", "You have casted your vote successfully");
    return response.redirect(`/e/${request.params.customURL}/results`);
  }
  try {
    const election = await Elections.fetchElectionWithURL(
      request.params.customURL
    );
    console.log(request.params.customURL + "   euihuwehowh")
    if (election.isEnded === true) {
      request.flash("error", "This election has ended,you can not vote now");
      return response.redirect(`/e/${request.params.customURL}/result`);
    }
    if (request.user.WhoThat === "voter") {
      if (election.isRunning) {
        const questions = await Questions.fetchAllQuestions(election.id);
        let options = [];
        for (let question in questions) {
          options.push(await Option.getAllOptions(questions[question].id));
        }
        return response.render("votingPage", {
          title: election.electionName,
          electionId: election.id,
          electionName: election.electionName,
          questions,
          options,
          customURL: request.params.customURL,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.render("404");
      }
    } else if (request.user.WhoThat === "admin") {
      request.flash("error", "You cannot vote as Admin!");
      request.flash("error", "Please signout from admin and try again");
      return response.redirect(`/elections/${election.id}`);
    }
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});
//get method for voterLogin
app.get("/e/:customURL/Voterlogin", async (request, response) => {
  try {
    const election = await Elections.fetchElectionWithURL(
      request.params.customURL
    );
    console.log(election.electionName)
    if (election.isRunning) {
      return response.render("voterLogin", {
        title: "Voter Login",
        customURL: request.params.customURL,
        electionId: election.id,
        csrfToken: request.csrfToken(),
      });
    } else {
      request.flash("This Election has ended");
      return response.redirect(`/e/${request.params.customURL}/results`)
    }
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});
//post for voter login
app.post(
  "/e/:customURL/Voterlogin",
  passport.authenticate("voters", {
    failureFlash: true,
    failureRedirect: "back",
  }),
 (request, response) => { 
    console.log(request.user.WhoThat + "yewgiuwgiugefuiwhuh")
  return response.redirect(`/e/${request.params.customURL}`);
  }
); 
app.get("/e/:customURL/results", async (request, response) => {
  response.render("result");
});
//for signout admin
app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

module.exports = app;

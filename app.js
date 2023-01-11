// eslint-disable-next-line no-undef
const express = require("express");
var csrf = require("tiny-csrf");
var cookieParser = require("cookie-parser");
const app = express();
const { Admin, Elections, Questions, Options, Voters } = require("./models");
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
//aking passport to work with express
app.use(passport.initialize());
app.use(passport.session());
passport.use(
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
//click signup-signup page
app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Signup",
    csrfToken: request.csrfToken(),
  });
});
//click login to render login
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
  //have to create user here
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
      const URLs= await Elections.fetchElectionWithURL(url);
      if(URLs.length>1){
        request.flash("error","Sorry,this string custom string is already been used");
        request.flash("error","Please Try again with another custom string");
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
  }
);

app.post(
  "/session",
  passport.authenticate("local", {
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
),
  app.get(
    "/elections/:id",
    connectEnsureLogin.ensureLoggedIn(),
    async (request, response) => {
      const elections = await Elections.getElectionWithId(request.params.id);
      const questionsCount = await Questions.countOfQuestions(request.params.id);
      // const allquestions = await Questions.fetchAllQuestions(request.params.id)
      const votersCount = await Voters.votersCount(request.params.id);
      let ElectionName = request.user.electionName;
      let questionDescription = request.user.questionDescription;
      
      return response.render("manageEle", {
        id: request.params.id,
        title: elections.electionName,
        ElectionName:elections.electionName,
        questionDescription: questions.questionDescription,
        csrfToken: request.csrfToken(),
        CoQuestions: questionsCount,
        CoVoters: votersCount,
        customURL: elections.customURL,
        isRunning:elections.isRunning,
      });
    }
  ),
  // for questions 
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
            ElectionName:elections.electionName,
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
      ElectionName:elections.electionName,
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
    response.render("createOptions", {
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
    const thissquestion=  await Questions.addNewQuestion({
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
      ElectionName:elections.electionName,
      csrfToken: request.csrfToken(),
      id: request.params.id,
    })

  })
app.get("/elections/:id/newVoters", connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("newVoter", {
      csrfToken: request.csrfToken(),
      id: request.params.id,
    })
  })

  app.post("/elections/:id/newVoters",connectEnsureLogin.ensureLoggedIn(),
   async(request,response)=>{
    const voterUserId=(request.body.voterUserId).trim();
    const voterPassword=request.body.voterPassword;

    if(voterUserId.length==0){
      request.flash("error","Voter's Username Should not be empty")
      return response.redirect(`/elections/${request.params.id}/newVoters`)
    }

    if(voterPassword.length < 8){
      request.flash("error","Password lenght must be of 8 characters");
      return response.redirect(`/elections/${request.params.id}/newVoters`);
    }
    try{
      await Voters.addVoter({
        voterUserId:voterUserId,
        voterPassword:voterPassword,
        electionId:request.params.id,
      })
      response.redirect(`/elections/${request.params.id}/Voters`)
    }
    catch(error){
      request.flash(error,error);
      response.redirect(`/elections/${request.params.id}/newVoters`)
    } 
  });

  app.get("/elections/:id/editQpage",
   connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const questionsCount = await Questions.countOfQuestions(request.params.id);
    const questions = await Questions.fetchAllQuestions(request.params.id);
    response.render("EditQpage", {
      csrfToken: request.csrfToken(),
      id : request.params.id,
      questions,
      CoQuestions: questionsCount,
      questionIds,
    })
  })
//edit options implementation
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
        if (election.isEnded==true) {
          request.flash("error", "You Cannot edit when election has ended");
          return response.redirect(`/elections/${request.params.id}/`);
        }
        if (election.isRunning===true) {
          request.flash("error", "You Cannot edit while election is running");
          return response.redirect(`/elections/${request.params.id}/`);
        }
        const question = await Questions.getQuestionWithId(request.params.questionId);
        const elections = await Elections.getElectionWithId(request.params.id);

        return response.render("EditQuestion", {
          electionId: request.params.id,
          ElectionName:elections.electionName,
          questionId: request.params.questionId,
          questionTitle: question.electionQuestion,
          questionDescription: question.questionDescription,
          csrfToken: request.csrfToken(),
          id:request.params.id,
        });
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    } else if (request.user.WhoThat === "voter") {
      return response.redirect("/");
    }
  });
  app.get(
    "/elections/:id/createNewQuestion/:questionId/editOption/:optionId",
    connectEnsureLogin.ensureLoggedIn(),
    async (request, response) => {
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
          const Options = await Options.get1Option(request.params.optionId);
          return response.render("UpdateOption", {
            option: Options.option,
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
  app.put(
    "/elections/:id/question/:questionId/edit",
    connectEnsureLogin.ensureLoggedIn(),
    async (request, response) => {
      if (request.user.WhoThat === "admin") {

        try {
          const election = await Elections.getElectionWithId(request.params.id);
          if (election.isEnded==true) {
            return response.json("You Cannot edit when the election has ended");
          }
          if (election.isRunning==true) {
            return response.json("You Cannot edit while the election is running");
          }
          if (request.user.id !== election.adminId) {
            return response.json({
              error: "Invalid Election-ID",
            });
          }
          const updatedQ = await Questions.updateAQuestion({
            electionQuestion: request.body.question,
            questionDescription: request.body.description,
            id: request.params.questionId,
          });
          return response.json(updatedQ);
        } catch (error) {
          console.log(error);
          return response.status(422).json(error);
        }
      } else if (request.user.WhoThat === "voter") {
        return response.redirect("/");
      }
    }
  );
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
          if(questionsCount==1){
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
// for preview page
  app.get("/elections/:id/previewEle",connectEnsureLogin.ensureLoggedIn(), async(request,response)=>{
    let ElectionName = request.user.electionName;
    if (request.user.WhoThat ==="admin") {
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
          console.log(error);
          return response.status(422).json(error);
        }
      } else if (request.user.WhoThat === "voter") {
        return response.redirect("/");
      }
    }
  );
//for signout
app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

module.exports = app;

// eslint-disable-next-line no-undef
const express = require("express");
var csrf = require("tiny-csrf");
var cookieParser = require("cookie-parser");
const app = express();
const { Admin, Elections } = require("./models");
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
    secret: "my-secret-super-key-120912091209",
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
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      Admin.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
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
passport.serializeUser((admin, done) => {
  console.log("Serializing user in session", admin.id);
  done(null, admin.id);
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

app.get("/signup", (request, response) => {
    response.render("signup", {
      title: "Signup",
      csrfToken: request.csrfToken(),
    });
  });

  app.get("/login", (request, response) => {
    response.render("login", { title: "Login", csrfToken: request.csrfToken() });
  });
  
  app.post("/admin", async (request, response) => {
    const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
    console.log(hashedPwd);
    try {
      const Admin = await Admin.create({
        FirstName: request.body.FirstName,
        LastName: request.body.LastName,
        Email: request.body.Email,
        Password: hashedPwd,
      });
      request.login(Admin, (err) => {
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

  app.post("/Elections",connectEnsureLogin.ensureLoggedIn(),async (request,response)=>{
    const nullString=(request.body.electionName).trim()
  if(nullString.length==0){
    request.flash("error","Election Name Should not be Null")
    return response.redirect("/Elections/create")
    }
    const url=request.body.customURL
    function WhiteSpacesCheck(value){
      return value.indexOf(' ') >= 0;
   }
   const whiteSpace=WhiteSpacesCheck(url);
   if(whiteSpace==true){
    request.flash("error","Do not use white spaces")
    console.log("Spaces found")
      return response.redirect("/elections/create")
   }
    try{
          await Elections.addElection({
            csrfToken:request.csrfToken(),
            adminId:request.user.id,
            customURL:request.body.customURL
          });
         return response.redirect("/Elections")
      }
      catch (error) {
        request.flash("error", error.message);
        return response.redirect("/Elections");
      }
  })

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
          response.render("elections", {
            title: "Online Voting",
            userName,
            Elections,
            csrfToken: request.csrfToken(),
          });
        } else {
          return response.json({ elections });
        }
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    },
    //to create election
    app.get("/elections/create",connectEnsureLogin.ensureLoggedIn(),async (request,response)=>{
      response.render("createElection",{
          title:"New Election",
          csrfToken:request.csrfToken(),
      })
  
    }),
  
  );

  app.get("/signout", (request, response, next) => {
    request.logout((err) => {
      if (err) {
        return next(err);
      }
      response.redirect("/");
    });
  });



module.exports = app;

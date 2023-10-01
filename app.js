require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Admin } = require("./mongodb");
const secretKey = process.env.SESSION_SECRET;
const JWT_SECRET = secretKey;
const cookieParser = require("cookie-parser");
const crypto = require("crypto");

app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

function authenticateJWT(req, res, next) {
  let token = req.cookies.jwt;

  if (!token && req.headers.authorization) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.redirect("/login");
      }
      req.user = user;
      next();
    });
  } else {
    res.redirect("/login");
  }
}
app.get("/", authenticateJWT, (req, res) => {
  res.redirect("/home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  const error = req.query.error;
  res.render("signup", { error });
});

app.get("/home", (req, res) => {
  res.render("home");
});

app.get("/admin", (req, res) => {
  res.render("admin-login");
});

app.get("/admin/dashboard", (req, res) => {
  res.render("admin-dashboard");
});

app.get("/verify-email", async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.query.token,
      email: req.query.email,
    });

    if (user) {
      user.verified = true;
      user.verificationToken = undefined;
      await user.save();

      res.redirect("/login?message=Email%20verified%20successfully");
    } else {
      res.redirect("/signup?error=Invalid%20verification%20link");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});


app.post("/signup", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const data = {
      name: req.body.name,
      email: req.body.email,
      phoneNo: req.body.phoneNo,
      password: hashedPassword,
      verificationToken,
    };

    await User.create(data);

    const verificationURL = `http://localhost:3000/verify-email?token=${verificationToken}&email=${req.body.email}`;

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: req.body.email,
      subject: "Email Verification",
      text: `Click on this link to verify your email: ${verificationURL}`,
      html: `<a href="${verificationURL}">Click here to verify your email</a>`,
    });

    res.redirect(
      "/login?message=Verification%20email%20sent.%20Please%20check%20your%20inbox"
    );
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      res.redirect("/signup?error=Email%20already%20exists");
    } else {
      res.status(500).send("Internal Server Error");
    }
  }
});

app.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user && (await bcrypt.compare(req.body.password, user.password))) {
      const token = jwt.sign(
        { email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: "730d" }
      );

      // Set the JWT token as an HTTP-Only cookie
      res.cookie("jwt", token, {
        httpOnly: true,
        maxAge: 730 * 24 * 60 * 60 * 1000, // 730 days in milliseconds
      });

      res.redirect("/home");
    } else {
      res.render("login", { notFound: "Incorrect email or password" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

app.post("/admin", async (req, res) => {
  try {
    const admin = await Admin.findOne({ userName: req.body.userName });
    if (admin && (await bcrypt.compare(req.body.password, admin.password))) {
      res.redirect("/admin/dashboard");
    } else {
      res.render("admin-login", { notFound: "Incorrect username or password" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

app.listen(3000, () => console.log("running at port 3000"));

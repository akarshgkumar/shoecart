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
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const cors = require("cors");

app.use(cors());
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

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

app.get("/enter-otp", (req, res) => {
  const error = req.query.error;
  const email = req.query.email;
  res.render("enter-otp", { error, email });
});

app.post("/signup", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    const data = {
      name: req.body.name,
      email: req.body.email,
      phoneNo: req.body.phoneNo,
      password: hashedPassword,
      otp,
      otpExpires,
    };

    await User.create(data);

    const msg = {
      to: req.body.email,
      from: { email: process.env.EMAIL },
      subject: "Your OTP for Signup",
      text: `Your OTP for signup is: ${otp}. It is valid for only 10 minutes.`,
    };

    sgMail
      .send(msg)
      .then(() => {
        res.redirect("/enter-otp?email=" + encodeURIComponent(req.body.email));
      })
      .catch((error) => {
        console.error(error);
        console.error("Error sending mail:", error.response.body.errors);
        res.status(500).send("Internal Server Error");
      });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      res.redirect("/signup?error=Email%20already%20exists");
    } else {
      res.status(500).send("Internal Server Error");
    }
  }
});

app.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found for email:", email);
      return res.json({ success: false, message: "User not found" });
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000;
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const msg = {
      to: email,
      from: { email: process.env.EMAIL },
      subject: "Your Resend OTP for Signup",
      text: `Your OTP for signup is: ${otp}. It is valid for only 10 minutes.`,
    };

    sgMail
      .send(msg)
      .then(() => {
        res.json({ success: true, message: "OTP sent successfully" });
      })
      .catch((error) => {
        console.error("Error sending mail:", error.response?.body?.errors);
        res.json({
          success: false,
          message: "Error sending OTP. Please try again later.",
        });
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    console.log(`No user found with email: ${email}`);
    return res.redirect("/signup?error=User%20not%20found");
  }

  if (otp === user.otp && Date.now() <= user.otpExpires) {
    user.verified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    res.redirect("/home");
  } else {
    res.redirect(
      `/enter-otp?error=Invalid%20or%20expired%20OTP&email=${encodeURIComponent(
        email
      )}`
    );
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
      res.cookie("jwt", token, {
        httpOnly: true,
        maxAge: 730 * 24 * 60 * 60 * 1000,
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

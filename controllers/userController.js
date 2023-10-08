const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const sgMail = require("@sendgrid/mail");
const User = require("../models/User");
const Cart = require("../models/Cart");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function noCache(req, res, next) {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  next();
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function redirectIfLoggedIn(req, res, next) {
  if (req.cookies.jwt) {
    res.redirect("/home");
  } else {
    next();
  }
}

async function setLoginStatus(req, res, next) {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      res.locals.isLoggedIn = false;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userEmail = decoded.email;

    const user = await User.findOne({ email: userEmail });

    if (user && user.verified) {
      if (user.isBlocked) {
        res.clearCookie("jwt");
        res.locals.isLoggedIn = false;
      } else {
        res.locals.isLoggedIn = true;
      }
    } else {
      res.locals.isLoggedIn = false;
    }

    next();
  } catch (error) {
    console.error("Error in setLoginStatus middleware:", error);
    res.locals.isLoggedIn = false;
    next();
  }
}

async function fetchCartForUser(req, res, next) {
  try {
      const token = req.cookies.jwt;
      if (!token) {
          res.locals.cartItems = 0;
          return next();
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const userEmail = decoded.email;

      const cart = await Cart.findOne({ userEmail });
      if (cart) {
          const totalItems = cart.products.reduce((acc, product) => acc + product.quantity, 0);
          res.locals.cartItems = totalItems;
      } else {
          res.locals.cartItems = 0;
      }
      next();
  } catch (error) {
      console.error("Error fetching cart in middleware:", error);
      res.locals.cartItems = 0;
      next();
  }
}

router.use(setLoginStatus);
router.use(fetchCartForUser)

router.get("/login", noCache, redirectIfLoggedIn, (req, res) => {
  res.render("login");
});

router.get("/signup", noCache, redirectIfLoggedIn, (req, res) => {
  const error = req.query.error;
  res.render("signup", { error });
});

router.post("/verify-otp", async (req, res) => {
  const { email, otp, forgot } = req.body;
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

    const token = jwt.sign({ email: user.email, name: user.name }, JWT_SECRET, {
      expiresIn: "730d",
    });
    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 730 * 24 * 60 * 60 * 1000,
    });
    if (forgot === "true") {
      res.redirect(`/reset-password?email=${encodeURIComponent(email)}`);
    } else {
      res.redirect("/home");
    }
  } else {
    res.redirect(
      `/enter-otp?error=Invalid%20or%20expired%20OTP&email=${encodeURIComponent(
        email
      )}`
    );
  }
});

router.get("/reset-password", (req, res) => {
  const email = req.params.email;
  res.render("reset-password", { email });
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.render("reset-password", { error: "Passwords do not match" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findOneAndUpdate({ email: email }, { password: hashedPassword });
    res.redirect("/login");
  } catch (error) {
    console.error("Error resetting password:", error);
    res
      .status(500)
      .render("reset-password", { error: "Internal Server Error" });
  }
});

router.get('/account', (req, res) => {
  res.render('user-account');
})

router.get("/enter-otp", noCache, redirectIfLoggedIn, (req, res) => {
  const error = req.query.error;
  const email = req.query.email;
  const forgot = req.query.forgot;
  res.render("enter-otp", { error, email, forgot });
});

router.get("/verify-email/:forgot", noCache, redirectIfLoggedIn, (req, res) => {
  const error = req.query.error;
  let forgot = false;
  if (req.params.forgot === "true") {
    forgot = true;
    res.render("verify-email", { error, forgot });
  } else if (req.params.forgot === "false") {
    forgot = false;
    res.render("verify-email", { error, forgot });
  } else {
    res.redirect("/home");
  }
});

router.get("/", (req, res) => {
  res.redirect("/home");
});

router.get("/logout", (req, res) => {
  res.clearCookie("jwt");
  res.redirect("/login");
});

router.get("/home", (req, res) => {
  res.render("home");
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user.isBlocked === true) {
      res.render("login", { notFound: "User is blocked" });
    } else if (
      user &&
      (await bcrypt.compare(req.body.password, user.password))
    ) {
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

router.post("/resend-otp", async (req, res) => {
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

router.post("/verify-email/:forgot", async (req, res) => {
  const forgot = req.params.forgot;
  const email = req.body.email;
  const user = await User.findOne({ email });

  if (user) {
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const msg = {
      to: email,
      from: { email: process.env.EMAIL },
      subject: "Your OTP for Login",
      text: `Your OTP for login is: ${otp}. It is valid for only 10 minutes.`,
    };

    sgMail
      .send(msg)
      .then(() => {
        res.redirect(
          `/enter-otp?email=${encodeURIComponent(
            email
          )}&otpExpires=${otpExpires}&forgot=${forgot}`
        );
      })
      .catch((error) => {
        console.error("Error sending mail:", error.response?.body?.errors);
        res.redirect(
          `/verify-email?${forgot}error=Error sending OTP. Please try again later.`
        );
      });
  } else {
    res.redirect(
      `/verify-email/${forgot}?error=Email not found in our records.`
    );
  }
});

router.post("/signup", async (req, res) => {
  try {
    if (req.body.password !== req.body.confirmPassword) {
      return res.redirect("/signup?error=Passwords%20do%20not%20match");
    }
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
        res.redirect(
          `/enter-otp?email=${encodeURIComponent(
            req.body.email
          )}&otpExpires=${otpExpires}`
        );
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

router.post("/add-to-cart", async (req, res) => {
  console.log("on post add to cart");
  try {
    if (!req.cookies.jwt) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userEmail = decoded.email;

    const { productId, name, price, image } = req.body;

    let cart = await Cart.findOne({ userEmail });
    if (!cart) {
      cart = new Cart({ userEmail, products: [] });
    }

    const productIndex = cart.products.findIndex(
      (p) => p.productId === productId
    );

    if (productIndex > -1) {
      cart.products[productIndex].quantity += 1;
    } else {
      cart.products.push({ productId, quantity: 1, name, price, image });
    }

    await cart.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/remove-from-cart", async (req, res) => {
  const { userEmail, productId } = req.body;
  console.log(userEmail);

  const cart = await Cart.findOne({ userEmail });
  if (!cart) return res.json({ success: false, message: "No cart found" });

  cart.products = cart.products.filter((p) => p.productId !== productId);

  await cart.save();
  res.redirect("/cart");
});

router.post("/clear-cart", async (req, res) => {
  const { userEmail } = req.body;

  await Cart.findOneAndRemove({ userEmail });
  res.redirect("/cart");
});

router.get("/cart", async (req, res) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.redirect("/login");
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userEmail = decoded.email;

    const cart = await Cart.findOne({ userEmail });

    res.render("shop-cart", { products: cart?.products || [], userEmail });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;

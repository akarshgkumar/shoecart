const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const User = require("../../models/User");

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

async function fetchUserFromToken(req, res, next) {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userEmail = decoded.email;

    const user = await User.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).send("User not found");
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Error fetching user from token:", error);
    next();
  }
}

module.exports = {
  setLoginStatus,
  fetchUserFromToken
};

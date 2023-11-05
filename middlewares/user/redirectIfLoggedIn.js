const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const User = require("../../models/User");

async function redirectIfLoggedIn(req, res, next) {
  try {
    const token = req.cookies.jwt;
    if(!token) {
      req.flash("error", "hi")
      return next();
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const userEmail = decoded.email;
    const user = await User.findOne({ email: userEmail });
    if (user && user.verified && !user.isBlocked) {
      res.redirect("/home");
    } else {
      next();
    }
  } catch (error) {
    
    next();
  }
}

module.exports = redirectIfLoggedIn;

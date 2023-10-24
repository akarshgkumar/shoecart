const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

function authenticateAdmin(req, res, next) {
  const token = req.cookies.adminJwt;
  if (!token) {
    return res.redirect("/admin");
  }

  jwt.verify(token, JWT_SECRET, (err, admin) => {
    if (err) {
      return res.redirect("/admin");
    }
    next();
  });
}

module.exports = authenticateAdmin;
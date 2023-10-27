const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Admin = require("../../models/Admin");
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const User = require("../../models/User");
const Category = require("../../models/Category");
const JWT_SECRET = process.env.JWT_SECRET;
const authenticateAdmin = require("../../middlewares/admin/authenticateAdmin");

router.get("/", async (req, res) => {
  const adminToken = req.cookies.adminJwt;

  if (adminToken) {
    res.redirect("/admin/dashboard")
  } else {
    res.redirect("/admin/admin-login");
  }
});

router.post("/", async (req, res) => {
  const { userName, password } = req.body;
  const admin = await Admin.findOne({ userName });
  if (admin && (await bcrypt.compare(password, admin.password))) {
    const adminToken = jwt.sign({ userName: admin.userName }, JWT_SECRET, {
      expiresIn: "730d",
    });
    res.cookie("adminJwt", adminToken, {
      httpOnly: true,
      maxAge: 730 * 24 * 60 * 60 * 1000,
    });
    res.redirect("/admin/dashboard");
  } else {
    res.render("admin/admin-login", {
      notFound: "Incorrect username or password",
    });
  }
});

router.use(authenticateAdmin);

router.get("/dashboard", (req, res) => {
  res.render("admin/admin-dashboard");
});

router.get("/logout", (req, res) => {
  res.clearCookie("adminJwt");
  res.redirect("/admin");
});

module.exports = router;

// Load environment variables
require("dotenv").config();

// Module imports
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const config = require("./config/default");
const flash = require("connect-flash");
const session = require("express-session");

// Route imports
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const generalRoutes = require("./routes/generalRoutes");

const app = express();

// Middleware configurations
app.use(session({ secret: process.env.SECRET_KEY, resave: false, saveUninitialized: true }));
app.use(flash());
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.locals.success_messages = req.flash("success");
  res.locals.error_messages = req.flash("error");
  next();
});
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(config.database.uri, config.database.options)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Static files and view engine setup
app.use("/static", express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// Use general routes
app.use("/", generalRoutes);

// Route configurations
app.use("/", userRoutes); 
app.use("/admin", adminRoutes);

// Error handlers
app.use((req, res, next) => {
  res.status(404).render("404");
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  req.flash("error", "Something went wrong! Please try again.");
  res.redirect("back");
});

// Start server
app.listen(config.server.port, () => {
  console.log(`Server running at port ${config.server.port}`);
});

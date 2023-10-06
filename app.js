require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const config = require('./config/default');
const userController = require("./controllers/userController");
const adminController = require("./controllers/adminController");
const productController = require("./controllers/productController");

const app = express();

mongoose
  .connect(config.database.uri, config.database.options)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());

app.use("/static", express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");

app.use("/", userController);

app.use("/admin", adminController);

app.use("/product", productController);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('something broke!');
});

app.listen(config.server.port, () => console.log("running at port 3000"));

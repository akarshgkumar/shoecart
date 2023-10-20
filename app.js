require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const config = require("./config/default");
const flash = require("connect-flash");
const session = require("express-session");
const accountController = require("./controllers/user/accountController");
const adminController = require("./controllers/admin/adminController");
const couponController = require("./controllers/admin/couponController");
const bannerController = require("./controllers/admin/bannerController");
const productController = require("./controllers/user/productController");
const orderController = require("./controllers/user/orderController");
const cartController = require("./controllers/user/cartController");
const wishlistController = require("./controllers/user/wishlistController");
const authMiddleware = require("./middlewares/authMiddleware");
const cartAndWishlistMiddleware = require("./middlewares/cartAndWishlistMiddleware");
const fetchCategoryMiddleware = require("./middlewares/fetchCategory");

const app = express();

app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
  })
);

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


app.use("/static", express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");

app.use("/admin", adminController);

app.use("/admin/coupon", couponController);

app.use("/admin/banner", bannerController);


app.use(authMiddleware.setLoginStatus);
app.use(authMiddleware.fetchUserFromToken);
app.use(cartAndWishlistMiddleware.fetchCartForUser);
app.use(cartAndWishlistMiddleware.fetchWishlistForUser);
app.use(fetchCategoryMiddleware);

mongoose
.connect(config.database.uri, config.database.options)
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.error("MongoDB connection error:", err));


app.use("/", accountController);

app.use("/order", orderController);

app.use("/cart", cartController);

app.use("/wishlist", wishlistController);

app.use("/product", productController);

app.use((req, res, next) => {
  res.status(404).render("404");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  req.flash("error", "Something went wrong! Please try again.");
  res.redirect("back");
});

app.listen(config.server.port, () =>
  console.log(`running at port ${config.server.port}`)
);

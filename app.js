require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const config = require("./config/default");
const flash = require("connect-flash");
const session = require("express-session");
const accountController = require("./controllers/user/accountController");
const productController = require("./controllers/user/productController");
const orderController = require("./controllers/user/orderController");
const cartController = require("./controllers/user/cartController");
const wishlistController = require("./controllers/user/wishlistController");
const authMiddleware = require("./middlewares/user/authMiddleware");
const cartAndWishlistMiddleware = require("./middlewares/user/cartAndWishlistMiddleware");
const adminAccountController = require("./controllers/admin/adminAccountController");
const adminProductController = require("./controllers/admin/adminProductController");
const adminBrandController = require("./controllers/admin/adminBrandController");
const adminCategoryController = require("./controllers/admin/adminCategoryController");
const adminOrderController = require("./controllers/admin/adminOrderController");
const adminUserController = require("./controllers/admin/adminUserController");
const adminBannerController = require("./controllers/admin/adminBannerController");
const adminCouponController = require("./controllers/admin/adminCouponController");
const fetchCategoryMiddleware = require("./middlewares/fetchCategory");
const authenticateAdmin = require("./middlewares/admin/authenticateAdmin");

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

mongoose
  .connect(config.database.uri, config.database.options)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/static", express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");

app.use(fetchCategoryMiddleware);

const userRouter = express.Router();
const adminRouter = express.Router();

// User-specific middleware
userRouter.use(authMiddleware.setLoginStatus);
userRouter.use(authMiddleware.fetchUserFromToken);
userRouter.use(cartAndWishlistMiddleware.fetchCartForUser);
userRouter.use(cartAndWishlistMiddleware.fetchWishlistForUser);

// User routes
userRouter.use("/", accountController);
userRouter.use("/order", orderController);
userRouter.use("/cart", cartController);
userRouter.use("/wishlist", wishlistController);
userRouter.use("/product", productController);

// Admin-specific middleware
adminRouter.use(authenticateAdmin);

// Admin routes
adminRouter.use("/", adminAccountController);
adminRouter.use("/", adminProductController);
adminRouter.use("/", adminCategoryController);
adminRouter.use("/", adminBrandController);
adminRouter.use("/", adminOrderController);
adminRouter.use("/", adminUserController);
adminRouter.use("/coupon", adminCouponController);
adminRouter.use("/banner", adminBannerController);

app.use("/", userRouter);
app.use("/admin", adminRouter);

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

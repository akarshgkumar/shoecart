const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const sgMail = require("@sendgrid/mail");
const User = require("../models/User");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Wishlist = require("../models/Wishlist");
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);

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

async function redirectIfLoggedIn(req, res, next) {
  try {
    const token = req.cookies.jwt;
    const decoded = jwt.verify(token, JWT_SECRET);
    const userEmail = decoded.email;
    const user = await User.findOne({ email: userEmail });
    if (user && user.verified && !user.isBlocked) {
      res.redirect("/home");
    } else {
      next();
    }
  } catch (error) {
    console.error("Error in setLoginStatus middleware:", error);
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

async function fetchCartForUser(req, res, next) {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      res.locals.cartItems = 0;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const cart = await Cart.findOne({ userId }).populate({
      path: "products.productId",
      select: "isDeleted",
    });

    if (cart) {
      const validProducts = cart.products.filter(
        (product) => product.productId && !product.productId.isDeleted
      );

      const totalItems = validProducts.reduce(
        (acc, product) => acc + product.quantity,
        0
      );
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

async function fetchWishlistForUser(req, res, next) {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      res.locals.wishlistItems = 0;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const wishlist = await Wishlist.findOne({ userId }).populate({
      path: "products.productId",
      select: "isDeleted",
    });

    if (wishlist) {
      const validProducts = wishlist.products?.filter(
        (product) => product.productId && !product.productId.isDeleted
      );

      const totalWishlistItems = validProducts.length;
      res.locals.wishlistItems = totalWishlistItems;
    } else {
      res.locals.wishlistItems = 0;
    }
    next();
  } catch (error) {
    console.error("Error fetching wishlist in middleware:", error);
    res.locals.wishlistItems = 0;
    next();
  }
}

router.use(setLoginStatus);
router.use(fetchCartForUser);
router.use(fetchWishlistForUser);
router.use(fetchUserFromToken);

router.get("/login", noCache, redirectIfLoggedIn, (req, res) => {
  res.render("login");
});

router.get("/signup", noCache, redirectIfLoggedIn, (req, res) => {
  const error = req.query.error;
  res.render("signup", { error });
});

router.post("/verify-otp", async (req, res) => {
  console.log("hi");
  const { email, otp, forgot } = req.body;
  console.log(forgot);
  console.log(email);
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

    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      {
        expiresIn: "730d",
      }
    );

    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 730 * 24 * 60 * 60 * 1000,
    });
    if (forgot === "true") {
      res.redirect(`/reset-password?email=${encodeURIComponent(email)}`);
    } else {
      req.flash("success", "Sucessfully logged in");
      res.redirect("/home");
    }
  } else {
    req.flash("error", "Invalid or expired otp");
    res.redirect(`/enter-otp?email=${encodeURIComponent(email)}`);
  }
});

router.get("/reset-password", (req, res) => {
  const email = req.query.email;
  console.log(email);
  res.render("reset-password", { email });
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.render("reset-password", {
        error: "Passwords do not match",
        email,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findOneAndUpdate({ email: email }, { password: hashedPassword });
    res.redirect("/login");
  } catch (error) {
    console.error("Error resetting password:", error);
    req.flash("success", "Sucessfully logged in");
    res.redirect("/reset-password");
  }
});

router.get("/account", async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.redirect("/login");
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).send("User not found");
    }

    const order = await Order.find({ user: userId }).populate(
      "products.product"
    );

    const orders = order.map((order) => {
      const totalItems = order.products.reduce(
        (acc, curr) => acc + curr.quantity,
        0
      );
      const totalAmount = order.products.reduce(
        (acc, curr) => acc + curr.price * curr.quantity,
        0
      );
      return {
        id:
          "#" +
          order.shortId,
        date: order.createdAt.toDateString(),
        status: order.status,
        total: `₹${totalAmount.toFixed(2)}`,
        items: `${totalItems} item${totalItems > 1 ? "s" : ""}`,
        fullId: order._id,
      };
    });

    const userData = {
      userId: user._id,
      username: user.name,
      email: user.email,
      phoneNo: user.phoneNo,
      orders: orders,
      addresses: user.addresses,
      message: req.query.message,
      error: req.query.error,
    };

    res.render("user-account", userData);
  } catch (error) {
    console.error(error);
    req.flash("error", "Internal server error");
    res.redirect("/home");
  }
});

router.get("/enter-otp", (req, res) => {
  const error = req.query.error;
  const email = req.query.email;
  const forgot = req.query.forgot;
  res.render("enter-otp", { error, email, forgot });
});

router.get("/verify-email/:forgot", (req, res) => {
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

router.get("/check-email/:forgot", (req, res) => {
  const email = req.query.email;
  console.log(email);
  if (req.params.forgot === "true") {
    res.render("check-email", { email });
  } else {
    res.redirect("/home");
  }
});

router.get("/", (req, res) => {
  res.redirect("/home");
});

router.get("/logout", (req, res) => {
  res.clearCookie("jwt");
  req.flash("success", "logged out successfully");
  res.redirect("/login");
});

router.get("/home", (req, res) => {
  res.render("home");
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.render("login", { notFound: "Email not registered" });
    }
    if (!user.verified) {
      const otp = generateOTP();
      const otpExpires = Date.now() + 10 * 60 * 1000;
      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();

      const msg = {
        to: req.body.email,
        from: { email: process.env.EMAIL },
        subject: "Your OTP for Login",
        text: `Your OTP for login is: ${otp}. It is valid for only 10 minutes.`,
      };
      sgMail
        .send(msg)
        .then(() => {
          return res.redirect(
            `/enter-otp?email=${encodeURIComponent(
              req.body.email
            )}&otpExpires=${otpExpires}`
          );
        })
        .catch((error) => {
          console.error("Error sending mail:", error.response?.body?.errors);
          return res.redirect(
            `/login?error=Error sending otp. Please try again later`
          );
        });
    }
    if (user.isBlocked === true) {
      res.render("login", { notFound: "User is blocked" });
    } else if (
      user &&
      (await bcrypt.compare(req.body.password, user.password))
    ) {
      const token = jwt.sign(
        { userId: user._id, email: user.email, name: user.name },
        JWT_SECRET,
        {
          expiresIn: "730d",
        }
      );

      res.cookie("jwt", token, {
        httpOnly: true,
        maxAge: 730 * 24 * 60 * 60 * 1000,
      });
      req.flash("success", "Sucessfully logged in");
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
  console.log(email);
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
    const user = await User.findOne({ email: req.body.email });
    if (user && !user.verified) {
      const otp = generateOTP();
      const otpExpires = Date.now() + 10 * 60 * 1000;
      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();

      const msg = {
        to: req.body.email,
        from: { email: process.env.EMAIL },
        subject: "Your OTP for Login",
        text: `Your OTP for login is: ${otp}. It is valid for only 10 minutes.`,
      };
      sgMail
        .send(msg)
        .then(() => {
          return res.redirect(
            `/enter-otp?email=${encodeURIComponent(
              req.body.email
            )}&otpExpires=${otpExpires}`
          );
        })
        .catch((error) => {
          console.error("Error sending mail:", error.response?.body?.errors);
          return res.redirect(
            `/signup?error=Error sending otp. Please try again later`
          );
        });
    }
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
    if (error.name === "MongoError" && error.code === 11000) {
      res.redirect("/signup?error=Email%20already%20exists");
    } else {
      res.status(500).send("Internal Server Error");
    }
  }
});

router.post("/add-to-cart", async (req, res) => {
  try {
    const { productId, size, quantity } = req.body;

    if (!req.cookies.jwt) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    const product = await Product.findById(productId);
    if (!product || product.stock < quantity) {
      return res.json({
        success: false,
        message: "Not enough stock available",
      });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, products: [] });
    }

    const productIndex = cart.products.findIndex(
      (p) =>
        p.productId.toString() === productId &&
        p.size.toString() === size.toString()
    );

    if (productIndex > -1) {
      cart.products[productIndex].quantity =
        parseInt(cart.products[productIndex].quantity) + parseInt(quantity);
    } else {
      cart.products.push({
        productId,
        size,
        quantity,
      });
    }
    await cart.save();
    const totalItems = cart.products.reduce(
      (acc, product) => acc + product.quantity,
      0
    );
    res.json({ success: true, cartItems: totalItems });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/clear-wishlist", async (req, res) => {
  try {
    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    await Wishlist.findOneAndDelete({ userId });
    req.flash("success", "Wishlist cleared successfully");
    res.redirect("/wishlist");
  } catch (error) {
    console.error("Error clearing wishlist:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/remove-from-wishlist", async (req, res) => {
  try {
    const productId = req.body.productId;
    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    let wishlist = await Wishlist.findOne({ userId });
    wishlist.products = wishlist.products.filter(
      (p) => p.productId.toString() !== productId
    );

    await wishlist.save();
    const totalWishlistItems = wishlist.products.length;

    res.json({ success: true, wishlistItems: totalWishlistItems });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/remove-from-cart", async (req, res) => {
  try {
    const productId = req.body.productId;

    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.json({ success: false, message: "No cart found" });
    }

    cart.products = cart.products.filter(
      (p) => p.productId.toString() !== productId
    );

    await cart.save();

    const totalItems = cart.products.reduce(
      (acc, product) => acc + product.quantity,
      0
    );

    res.json({ success: true, cartItems: totalItems });
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/clear-cart", async (req, res) => {
  try {
    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    await Cart.findOneAndRemove({ userId });
    req.flash("success", "Cart cleared");
  } catch (error) {
    console.error("Error clearing the cart:", error);
    req.flash("error", "Failed to clear cart. Please try again.");
  }
  res.redirect("/cart");
});

router.get("/cart", async (req, res) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.redirect("/login");
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const cart = await Cart.findOne({ userId }).populate({
      path: "products.productId",
      match: { isDeleted: false },
    });

    const validProducts =
      cart?.products.filter((product) => product.productId) || [];

    const populatedProducts = validProducts.map((product) => ({
      ...product.productId._doc,
      quantity: product.quantity,
      selectedSize: product.size,
    }));

    res.render("shop-cart", { products: populatedProducts, userId });
  } catch (error) {
    console.error("Error fetching cart:", error);
    req.flash("error", "Internal server error");
    res.redirect("/home");
  }
});

router.post("/update-product-size", async (req, res) => {
  try {
    const { productId, newSize } = req.body;
    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    const cart = await Cart.findOne({ userId });
    const productIndex = cart.products.findIndex(
      (p) => p.productId.toString() === productId
    );

    if (productIndex > -1) {
      cart.products[productIndex].size =
        newSize || cart.products[productIndex].product.sizes[0];
      await cart.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating product size:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/edit-account", async (req, res) => {
  const { userId, name, email, phoneNo } = req.body;

  try {
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      { name, email, phoneNo },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).send("User not found.");
    }
    const token = jwt.sign(
      {
        userId: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
      },
      JWT_SECRET,
      { expiresIn: "730d" }
    );
    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 730 * 24 * 60 * 60 * 1000,
    });

    res.redirect("/account");
  } catch (error) {
    console.error("Error updating the user:", error);
    req.flash("error", "Internal server error");
    res.redirect("/account");
  }
});

router.post("/add-address", async (req, res) => {
  try {
    const {
      userId,
      name,
      email,
      phoneNo,
      companyName,
      address,
      addressLine1,
      city,
      state,
      postalCode,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found.");
    }

    const isDefault = req.body.setAsDefault === "on";
    if (isDefault) {
      user.addresses.forEach((address) => {
        address.default = false;
      });
    }

    user.addresses.push({
      name,
      email,
      phoneNo,
      companyName,
      address,
      addressLine1,
      city,
      state,
      postalCode: parseInt(postalCode),
      default: isDefault,
    });

    await user.save();
    req.flash("success", "Address added successfully");
    res.redirect("/account");
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).send("Internal server error");
  }
});

router.get("/edit-address/:addressId", async (req, res) => {
  if (!req.user) {
    return res.status(403).send("Not authenticated");
  }
  const addressId = req.params.addressId;
  const address = req.user.addresses.id(addressId);
  if (!address) {
    return res.status(404).send("Address not found.");
  }
  res.render("edit-address", { address: address });
});

router.post("/update-address/:addressId", async (req, res) => {
  const addressId = req.params.addressId;
  const updatedAddress = req.body;
  const address = req.user.addresses.id(addressId);
  Object.assign(address, updatedAddress);
  await req.user.save();
  req.flash("success", "Address updated successfully");
  res.redirect("/account");
});

router.post("/cancel-order", async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);

    if (!order || order.isCancelled) {
      req.flash("error", "Order not found or already cancelled");
      return res.redirect(`/account#orders`);
    }

    order.isCancelled = true;
    order.status = "Cancelled";
    await order.save();

    for (let orderedProduct of order.products) {
      console.log(orderedProduct.product);
      const product = await Product.findById(orderedProduct.product);
      console.log(product);
      product.stock += orderedProduct.quantity;
      await product.save();
    }
    req.flash("success", "Order cancelled successfully");
    res.redirect("/account#orders");
  } catch (err) {
    console.error("Error cancelling order:", err);
    req.flash("error", "Some error occured");
    res.redirect(`/account#orders`);
  }
});

router.post("/update-cart-quantity", async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.json({ success: false, message: "No cart found" });
    }

    const productToUpdate = cart.products.find(
      (p) => p.productId.toString() === productId
    );
    if (productToUpdate) {
      productToUpdate.quantity = quantity;
      await cart.save();
      const totalItems = cart.products.reduce(
        (acc, product) => acc + product.quantity,
        0
      );
      res.json({ success: true, cartItems: totalItems });
    } else {
      res.json({ success: false, message: "Product not found in cart" });
    }
  } catch (error) {
    console.error("Error updating product quantity:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/remove-address/:addressId", async (req, res) => {
  try {
    const addressId = req.params.addressId;
    await User.updateOne(
      { _id: req.user._id },
      {
        $pull: { addresses: { _id: addressId } },
      }
    );
    req.flash("success", "Address removed successfully");
    res.redirect("/account");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/change-password", async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmNewPassword, userId } = req.body;
    const user = await User.findById(userId);
    console.log(req.body);

    if (!user) {
      return res.redirect("/account?error=User not found.");
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);

    if (!isValidPassword) {
      req.flash("error", "Old Password is incorrect");
      return res.redirect("/account");
    }

    if (newPassword !== confirmNewPassword) {
      req.flash("error", "New passwords doesn't match");
      return res.redirect("/account");
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();
    req.flash("success", "Password changed successfully");
    return res.redirect("/account");
  } catch (error) {
    console.error("Error changing password:", error);
    return res.redirect("/account?error=Internal Server Error");
  }
});

router.get("/checkout", async (req, res) => {
  try {
    const token = req.cookies.jwt;
    const error = req.query.error;

    if (!token) {
      return res.redirect("/login");
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const cart = await Cart.findOne({ userId }).populate({
      path: "products.productId",
      match: { isDeleted: false },
    });

    let totalPrice = 0;

    const validProducts =
      cart?.products.filter((product) => product.productId) || [];

    const populatedProducts = validProducts.map((product) => {
      const productTotalPrice = product.productId.price * product.quantity;

      totalPrice += productTotalPrice;

      return {
        ...product.productId._doc,
        quantity: product.quantity,
        size: product.size,
        price: productTotalPrice,
      };
    });

    for (const product of validProducts) {
      product.price = product.productId.price * product.quantity;
    }

    await cart.save();

    const user = await User.findById(userId);
    const defaultAddress = user.addresses.find((address) => address.default);

    res.render("user-checkout", {
      products: populatedProducts,
      defaultAddress: defaultAddress,
      userId,
      totalPrice,
      error,
    });
  } catch (error) {
    console.error("Error fetching checkout data:", error);
    res.status(500).send("Internal server error");
  }
});

router.post("/set-default-address", async (req, res) => {
  try {
    const { userId, addressId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found.");
    }

    user.addresses.forEach((address) => {
      address.default = address._id.toString() === addressId;
    });

    await user.save();
    req.flash("success", "Default address changed");
    res.redirect("/account");
  } catch (error) {
    console.error("Error setting default address:", error);
    req.flash("error", "Something unexpected happened");
    res.redirect("/account");
  }
});

router.get("/select-address", async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.redirect("/login");
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.render("select-address", { addresses: user.addresses, userId });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

router.post("/place-order", async (req, res) => {
  const {
    user,
    name,
    email,
    phone,
    cname,
    shipping_address,
    shipping_address2,
    city,
    state,
    zipcode,
    payment_option,
    totalAmount,
  } = req.body;

  if (
    !name ||
    !email ||
    !phone ||
    !shipping_address ||
    !city ||
    !state ||
    !zipcode ||
    !payment_option
  ) {
    req.flash("error", "fill all required fields");
    return res.redirect("/checkout");
  }

  try {
    let uniqueShortId = nanoid();
    let existingOrder = await Order.findOne({ shortId: uniqueShortId });

    while (existingOrder) {
      uniqueShortId = nanoid();
      existingOrder = await Order.findOne({ shortId: uniqueShortId });
    }

    const cart = await Cart.findOne({ userId: user });

    if (!cart) {
      return res.redirect(
        "/checkout?error=No%20cart%20found%20for%20the%20user."
      );
    }

    const mappedProducts = await Promise.all(
      cart.products.map(async (cartProduct) => {
        const product = await Product.findById(cartProduct.productId).populate(
          "brand"
        );
        return {
          product: product._id,
          quantity: cartProduct.quantity,
          price: product.price,
          size: cartProduct.size,
          mainImg: product.mainImage,
          name: product.name,
          brand: product.brand.name,
        };
      })
    );

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 3);

    const order = new Order({
      shortId: uniqueShortId,
      user: user,
      products: mappedProducts,
      address: {
        name: name,
        email: email,
        phoneNo: phone,
        companyName: cname,
        address: shipping_address,
        addressLine1: shipping_address2,
        city: city,
        state: state,
        postalCode: zipcode,
      },
      paymentMethod: payment_option,
      subTotal: parseFloat(totalAmount),
      totalAmount: parseFloat(totalAmount),
      deliveryDate: deliveryDate,
    });

    await order.save();

    for (let cartProduct of cart.products) {
      const product = await Product.findById(cartProduct.productId);
      product.stock -= cartProduct.quantity;
      await product.save();
    }

    await Cart.deleteOne({ userId: user });
    req.flash("success", "Order is successful");
    return res.redirect("/home");
  } catch (err) {
    if (err.name === "MongoError" && err.code === 11000) {
      console.error("Duplicate key error:", err);
      req.flash(
        "error",
        "An error occurred while processing your order. Please try again."
      );
    } else {
      console.error("Error placing order:", err);
      req.flash("error", "An error occurred while placing order");
    }
    return res.redirect("/checkout");
  }
});

router.get("/view-single-order/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate(
      "products.product"
    );
    res.render("user-view-single-order", { order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).send("Server error");
  }
});

router.post("/validate-cart", async (req, res) => {
  try {
    const userId = req.body.userId;
    const cart = await Cart.findOne({ userId }).populate("products.productId");

    if (!cart || cart.products.length === 0) {
      return res.json({ status: "failure", message: "Cart is empty" });
    }

    const validProducts = cart.products.filter(
      (product) => !product.productId.isDeleted
    );

    if (validProducts.length === 0) {
      return res.json({ status: "failure", message: "Cart is empty" });
    }

    let isValid = true;

    for (let i = 0; i < validProducts.length; i++) {
      const productInCart = validProducts[i];
      const actualProduct = await Product.findById(productInCart.productId);

      if (actualProduct.stock < productInCart.quantity) {
        isValid = false;
        break;
      }
    }

    if (isValid) {
      res.json({ status: "success" });
    } else {
      res.json({
        status: "failure",
        message: "Product quantity exceeds stock",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    res.json({ status: "failure", message: "An error occurred" });
  }
});

router.post("/add-to-wishlist", async (req, res) => {
  try {
    const { productId } = req.body;

    if (!req.cookies.jwt) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId, products: [] });
    }

    const productIndex = wishlist.products.findIndex(
      (p) => p.productId.toString() === productId
    );

    if (productIndex !== -1) {
      return res.json({ success: false, alreadyExists: true });
    }

    wishlist.products.push({ productId });
    await wishlist.save();
    const totalWishlistItems = wishlist.products.length;

    res.json({ success: true, wishlistItems: totalWishlistItems });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/wishlist", async (req, res) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.redirect("/login");
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const wishlist = await Wishlist.findOne({ userId }).populate({
      path: "products.productId",
      match: { isDeleted: false },
    });

    const validProducts =
      wishlist?.products.filter((product) => product.productId) || [];

    res.render("user-wishlist", { products: validProducts, userId });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    req.flash("error", "Error fetching wishlist");
    res.redirect("/home");
  }
});

module.exports = router;

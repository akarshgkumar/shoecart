const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const sgMail = require("@sendgrid/mail");
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);
const User = require("../../models/User");
const Order = require("../../models/Order");
const Banner = require("../../models/Banner");
const Product = require("../../models/Product");
const WalletTransaction = require("../../models/WalletTransaction");
const noCache = require("../../middlewares/user/noCache");
const redirectIfLoggedIn = require("../../middlewares/user/redirectIfLoggedIn");
const generateOTP = require("../../utils/generateOTP");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

router.get("/login", noCache, redirectIfLoggedIn, (req, res) => {
  console.log("here");
  res.render("user/login");
});

router.get("/signup", noCache, redirectIfLoggedIn, (req, res) => {
  const error = req.query.error;
  res.render("user/signup", { error });
});

router.post("/verify-otp", async (req, res) => {
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

    let uniqueReferralCode;
    let existingUser;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      uniqueReferralCode = nanoid();
      existingUser = await User.findOne({ referralCode: uniqueReferralCode });
      attempts++;
      if (attempts >= maxAttempts) {
        req.flash("error", "Unexpected error occurred, please try again");
        return res.redirect("/signup");
      }
    } while (existingUser);

    user.referralCode = uniqueReferralCode;

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
      req.flash("success", "Successfully logged in");
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
  res.render("user/reset-password", { email });
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.render("user/reset-password", {
        error: "Passwords do not match",
        email,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findOneAndUpdate({ email: email }, { password: hashedPassword });
    res.redirect("/login");
  } catch (error) {
    console.error("Error resetting password:", error);
    req.flash("success", "Successfully logged in");
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
    console.log("user name :", user.name);

    if (!user) {
      return res.status(404).send("User not found");
    }

    const order = await Order.find({ user: userId }).populate(
      "products.product"
    );

    const walletTransactions = await WalletTransaction.find({
      userId: userId,
    }).populate("orderId");
    const validWalletTransactions = walletTransactions.filter(
      (transaction) => transaction.orderId !== null
    );

    const userData = {
      userId: user._id,
      username: user.name,
      email: user.email,
      referralCode: user.referralCode,
      referralEarnings: user.referralEarnings,
      phoneNo: user.phoneNo,
      orders: order,
      addresses: user.addresses,
      walletTransactions: validWalletTransactions,
      walletBalance: user.wallet?.balance,
      message: req.query.message,
      error: req.query.error,
    };

    res.render("user/user-account", {
      ...userData,
      categories: req.categories,
    });
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
  res.render("user/enter-otp", { error, email, forgot });
});

router.get("/verify-email/:forgot", (req, res) => {
  const error = req.query.error;
  let forgot = false;
  if (req.params.forgot === "true") {
    forgot = true;
    res.render("user/verify-email", { error, forgot });
  } else if (req.params.forgot === "false") {
    forgot = false;
    res.render("user/verify-email", { error, forgot });
  } else {
    res.redirect("/home");
  }
});

router.get("/check-email/:forgot", (req, res) => {
  const email = req.query.email;
  console.log(email);
  if (req.params.forgot === "true") {
    res.render("user/check-email", { email });
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

router.get("/home", async (req, res) => {
  try {
    const firstBanner = await Banner.findOne({ name: "Main Image" });
    const secondBanner = await Banner.findOne({ name: "Secondary Image" });
    const thirdBanner = await Banner.findOne({ name: "Promotional Image" });

    const randomProducts = await Product.aggregate([
      {
        $match: {
          isDeleted: false,
          brand: { $exists: true, $ne: null },
          category: { $exists: true, $ne: null },
        },
      },
      { $sample: { size: 8 } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
    ]);

    const filter = {
      isDeleted: false,
      brand: { $exists: true, $ne: null },
      category: { $exists: true, $ne: null },
    };

    const latestProducts = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(8)
      .populate(["category", "brand"]);

    const mostSoldProducts = await Product.find(filter)
      .sort({ totalSoldItems: -1 })
      .limit(8)
      .populate("category");

    res.render("user/home", {
      categories: req.categories,
      firstBanner,
      secondBanner,
      thirdBanner,
      randomProducts,
      latestProducts,
      mostSoldProducts,
    });
  } catch (error) {
    console.log(error);
    req.flash("error", "Internal server error");
    res.redirect("back");
  }
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.render("user/login", { notFound: "Email not registered" });
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
      res.render("user/login", { notFound: "User is blocked" });
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
      req.flash("success", "Successfully logged in");
      res.redirect("/home");
    } else {
      res.render("user/login", { notFound: "Incorrect email or password" });
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

router.post("/check-referral", async (req, res) => {
  try {
    const regex = new RegExp(`^${req.body.referralCode}$`, "i");
    const user = await User.findOne({ referralCode: regex });
    if (user) {
      return res.json({ valid: true });
    } else {
      return res.json({ valid: false });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
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
      wallet: {
        balance: 0,
      }
    };
    const referralCodeUppercase = req.body.referralCode.toUpperCase();

    const referrer = await User.findOne({
      referralCode: referralCodeUppercase,
    });
    if (referrer) {
      data.referredBy = referrer.referralCode;
      data.wallet.balance = 250;
    }

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
  res.render("user/edit-address", { address: address });
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

module.exports = router;

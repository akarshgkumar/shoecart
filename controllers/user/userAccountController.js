const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);

const User = require("../../models/User");
const Order = require("../../models/Order");
const Banner = require("../../models/Banner");
const Product = require("../../models/Product");
const WalletTransaction = require("../../models/WalletTransaction");
const generateOTP = require("../../utils/generateOTP");

exports.getLogin = (req, res) => {
  res.render("user/login");
};

exports.getSignup = (req, res) => {
  const error = req.query.error;
  res.render("user/signup", { error });
};

exports.verifyOTP = async (req, res) => {
  const { email, otp, forgot } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
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
};

exports.getResetPassword = (req, res) => {
  const email = req.query.email;
  res.render("user/reset-password", { email });
};

exports.postResetPassword = async (req, res) => {
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
    
    req.flash("success", "Successfully logged in");
    res.redirect("/reset-password");
  }
};

exports.getAccount = async (req, res) => {
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

    const orders = await Order.find({ user: userId })
      .populate("products.product")
      .sort({ createdAt: -1 });

    const walletTransactions = await WalletTransaction.find({
      userId: userId,
    })
      .populate("orderId")
      .sort({ createdAt: -1 });
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
      orders: orders,
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
    
    req.flash("error", "Internal server error");
    res.redirect("/home");
  }
};

exports.getEnterOTP = (req, res) => {
  const error = req.query.error;
  const email = req.query.email;
  const forgot = req.query.forgot;
  res.render("user/enter-otp", { error, email, forgot });
};

exports.getVerifyEmail = (req, res) => {
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
};

exports.getCheckEmail = (req, res) => {
  const email = req.query.email;
  if (req.params.forgot === "true") {
    res.render("user/check-email", { email });
  } else {
    res.redirect("/home");
  }
};

exports.getHomeRedirect = (req, res) => {
  res.redirect("/home");
};

exports.logout = (req, res) => {
  res.clearCookie("jwt");
  req.flash("success", "logged out successfully");
  res.redirect("/login");
};

exports.getHome = async (req, res) => {
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
    req.flash("error", "Internal server error");
    res.redirect("back");
  }
};

exports.postLogin = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      req.flash("error", "Email not registered");
      return res.redirect("/login");
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
          
          return res.redirect(
            `/login?error=Error sending otp. Please try again later`
          );
        });
    }
    if (user.isBlocked === true) {
      req.flash("error", "User is blocked");
      res.redirect("/login");
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
      req.flash("error", "Incorrect email or password");
      res.redirect("/login");
    }
  } catch (error) {
    
    req.flash("error", "Sorry server error");
    return res.redirect("/login");
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const token = req.cookies.jwt;
    if (!token) {
      res.redirect("error", "Please login again");
      return res.redirect("/login");
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const user = await User.findOne({ _id: userId });
    if (!user) {
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
        
        res.json({
          success: false,
          message: "Error sending OTP. Please try again later.",
        });
      });
  } catch (error) {
    
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const forgot = req.params.forgot;
    const email = req.body.email;
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

      await sgMail.send(msg);
      res.redirect(
        `/enter-otp?email=${encodeURIComponent(
          email
        )}&otpExpires=${otpExpires}&forgot=${forgot}`
      );
    } else {
      res.redirect(
        `/verify-email/${forgot}?error=Email not found in our records.`
      );
    }
  } catch (error) {
    
    req.flash(
      "error",
      "There was an error sending the OTP. Please try again later."
    );
    res.redirect(`/verify-email/${forgot}`);
  }
};

exports.checkReferral = async (req, res) => {
  try {
    const regex = new RegExp(`^${req.body.referralCode}$`, "i");
    const user = await User.findOne({ referralCode: regex });
    if (user) {
      return res.json({ valid: true, userName: user.name });
    } else {
      return res.json({ valid: false });
    }
  } catch (error) {
    
    return res.status(500).send("Internal Server Error");
  }
};

exports.signup = async (req, res) => {
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
      },
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
        
        
        res.status(500).send("Internal Server Error");
      });
  } catch (error) {
    
    if (error.name === "MongoError" && error.code === 11000) {
      res.redirect("/signup?error=Email%20already%20exists");
    } else {
      res.status(500).send("Internal Server Error");
    }
  }
};

exports.editAccount = async (req, res) => {
  const { userId, name, email, phoneNo } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/home");
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      { name, phoneNo },
      { new: true }
    );
    const token = jwt.sign(
      {
        userId: updatedUser._id,
        name: updatedUser.name,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "730d" }
    );

    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 730 * 24 * 60 * 60 * 1000,
    });

    if (user.email !== email) {
      const emailExists =  await User.findOne({ email });
      if (!emailExists) {
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

        try {
          await sgMail.send(msg);
          return res.redirect(
            `/change-email?email=${encodeURIComponent(
              email
            )}&otpExpires=${otpExpires}`
          );
        } catch (error) {
          
          req.flash("error", "Error sending otp to new email, try again later");
          return res.redirect("/account#edit-account-detail");
        }
      } else {
        req.flash("error", "Account with this email already exists");
        return res.redirect("/account#edit-account-detail");      }
    } else {
      req.flash("success", "Account details edited successfully");
      return res.redirect("/account#account-detail");
    }
  } catch (error) {
    
    req.flash("error", "Internal server error");
    return res.redirect("/account");
  }
};

exports.addAddress = async (req, res) => {
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
    
    req.flash("error", "Internal server error");
    res.redirect("/account");
  }
};

exports.getEditAddress = async (req, res) => {
  if (!req.user) {
    req.flash("error", "Not authenticated");
    return res.redirect("/login");
  }
  const addressId = req.params.addressId;
  const address = req.user.addresses.id(addressId);
  if (!address) {
    req.flash("error", "Address not found.");
    return res.redirect("/account");
  }
  res.render("user/edit-address", { address: address });
};

exports.updateAddress = async (req, res) => {
  try {
    const addressId = req.params.addressId;
    const updatedAddress = req.body;
    const address = req.user.addresses.id(addressId);

    if (!address) {
      req.flash("error", "Address not found.");
      return res.redirect("/account");
    }

    Object.assign(address, updatedAddress);
    await req.user.save();

    req.flash("success", "Address updated successfully");
    res.redirect("/account");
  } catch (error) {
    
    req.flash("error", "Failed to update address.");
    res.redirect("/account");
  }
};

exports.removeAddress = async (req, res) => {
  try {
    const addressId = req.params.addressId;
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { addresses: { _id: addressId } } }
    );
    req.flash("success", "Address removed successfully");
    res.redirect("/account");
  } catch (error) {
    
    req.flash("error", "Failed to remove the address. Please try again later.");
    res.redirect("/account");
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmNewPassword, userId } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/home");
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      req.flash("error", "Old password is incorrect.");
      return res.redirect("/account#change-password");
    }

    if (newPassword !== confirmNewPassword) {
      req.flash("error", "New passwords do not match.");
      return res.redirect("/account#change-password");
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    req.flash("success", "Password changed successfully.");
    return res.redirect("/account");
  } catch (error) {
    
    req.flash(
      "error",
      "An error occurred while changing the password. Please try again later."
    );
    return res.redirect("/account");
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/account");
    }
    user.addresses.forEach((address) => {
      address.default = address._id.toString() === addressId;
    });

    await user.save();
    req.flash("success", "Default address changed");
    res.redirect("/account");
  } catch (error) {
    
    req.flash("error", "Something unexpected happened");
    res.redirect("/account");
  }
};

exports.getChangeEmail = (req, res) => {
  const email = req.query.email;
  res.render("user/change-email-otp", { email });
};

exports.postChangeEmail = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      res.redirect("error", "Please login again");
      return res.redirect("/login");
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const { email, otp } = req.body;
    const user = await User.findById(userId);
    if (otp === user.otp && Date.now() <= user.otpExpires) {
      user.otp = undefined;
      user.otpExpires = undefined;
      user.email = email;

      await user.save();

      const token = jwt.sign(
        { userId: user._id, email: email, name: user.name },
        JWT_SECRET,
        {
          expiresIn: "730d",
        }
      );

      res.cookie("jwt", token, {
        httpOnly: true,
        maxAge: 730 * 24 * 60 * 60 * 1000,
      });
      req.flash("success", "Email edited successfully");
      res.redirect("/account#account-detail");
    } else {
      req.flash("error", "Invalid or expired otp");
      res.redirect(`/change-email?email=${encodeURIComponent(email)}`);
    }
  } catch {
    
    req.flash("error", "Sorry server error");
    return res.redirect("/home");
  }
};

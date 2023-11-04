const express = require("express");
const router = express.Router();
const userController = require("../../controllers/user/userAccountController");
const noCache = require("../../middlewares/user/noCache");
const redirectIfLoggedIn = require("../../middlewares/user/redirectIfLoggedIn");

// Login routes
router.get("/login", noCache, redirectIfLoggedIn, userController.getLogin);
router.post("/login", userController.postLogin);

// Signup routes
router.get("/signup", noCache, redirectIfLoggedIn, userController.getSignup);
router.post("/signup", userController.signup);

// OTP verification routes
router.get("/verify-email/:forgot", userController.getVerifyEmail);
router.post("/verify-email/:forgot", userController.verifyEmail);
router.get("/enter-otp", userController.getEnterOTP);
router.post("/verify-otp", userController.verifyOTP);
router.post("/resend-otp", userController.resendOTP);
router.get("/change-email", userController.getChangeEmail);
router.post("/change-email", userController.postChangeEmail)

// Password reset routes
router.get("/reset-password", userController.getResetPassword);
router.post("/reset-password", userController.postResetPassword);

// Account management routes
router.get("/account", userController.getAccount);
router.post("/edit-account", userController.editAccount);
router.post("/change-password", userController.changePassword);

// Address management routes
router.get("/edit-address/:addressId", userController.getEditAddress);
router.post("/update-address/:addressId", userController.updateAddress);
router.post("/add-address", userController.addAddress);
router.post("/remove-address/:addressId", userController.removeAddress);
router.post("/set-default-address", userController.setDefaultAddress);

// Other routes
router.get("/check-email/:forgot", userController.getCheckEmail);
router.post("/check-referral", userController.checkReferral);
router.get("/logout", userController.logout);
router.get("/home", userController.getHome);
router.get("/", userController.getHomeRedirect);

module.exports = router;

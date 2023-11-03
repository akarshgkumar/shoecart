const express = require("express");
const router = express.Router();
const adminCouponController = require("../../controllers/admin/adminCouponController");

// Route to view all coupons
router.get("/view-coupons", adminCouponController.viewCoupons);

// Routes for adding a new coupon
router.get("/add-coupon", adminCouponController.addCouponGet);
router.post("/add-coupon", adminCouponController.addCouponPost);

// Routes for editing an existing coupon
router.get("/edit-coupon/:couponId", adminCouponController.editCouponGet);
router.post("/edit-coupon/:couponId", adminCouponController.editCouponPost);

// Route to check if a coupon code exists
router.get("/check-coupon/", adminCouponController.checkCoupon);

// Routes to show or hide a coupon
router.get("/show-coupon/:couponId", adminCouponController.showCoupon);
router.get("/hide-coupon/:couponId", adminCouponController.hideCoupon);

// Route to search for coupons
router.get("/search-coupon", adminCouponController.searchCoupon);

module.exports = router;

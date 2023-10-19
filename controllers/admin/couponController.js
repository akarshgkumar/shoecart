const express = require("express");
const router = express.Router();
const Coupon = require("../../models/Coupon");

router.get("/view-coupons", async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 10,
  };

  const filter = { isDeleted: false };

  try {
    const result = await Coupon.paginate(filter, options);
    res.render("admin/admin-view-coupons", {
      coupons: result.docs,
      couponCount: result.totalDocs,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (err) {
    console.error("Error fetching coupons:", err);
    res.redirect("/admin-home");
  }
});

router.get("/add-coupon", (req, res) => {
  res.render("admin/admin-add-coupon");
});

router.post("/add-coupon", async (req, res) => {
  try {
    const newCoupon = new Coupon({
      code: req.body.coupon_code,
      discountPercentage: req.body.discount_percentage,
    });
    await newCoupon.save();
    res.redirect("/admin/coupon/view-coupons");
  } catch (err) {
    console.error("Error while adding coupon:", err);
    req.flash("error", "Error while adding coupon");
    res.redirect("back");
  }
});

router.get("/edit-coupon/:couponId", async (req, res) => {
  const couponId = req.params.couponId;
  const coupon = await Coupon.findOne({ _id: couponId });
  if (coupon) {
    res.render("admin/admin-edit-coupon", { coupon });
  } else {
    req.flash("Invalid coupon!");
    res.redirect("back");
  }
});

router.post("/edit-coupon/:couponId", async (req, res) => {
  const coupon = await Coupon.findById(req.params.couponId);
  if (!coupon) {
    req.flash("Invalid coupon!");
    return res.redirect("back");
  }
  coupon.code = req.body.coupon_code || coupon.code;
  coupon.discountPercentage =
    req.body.discount_percentage || coupon.discountPercentage;
  await coupon.save();
  req.flash("success", "Coupon edited successfully");
  res.redirect("/admin/coupon/view-coupons");
});

router.get("/check-coupon/:code", async (req, res) => {
  try {
    const coupon = await Coupon.findOne({
      code: { $regex: `^${req.params.code}$`, $options: "i" },
    });
    console.log(coupon);
    if (coupon) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/delete-coupon/:couponId", async (req, res) => {
  try {
    const couponId = req.params.couponId;
    await Coupon.findByIdAndUpdate(couponId, { $set: { isDeleted: true } });
    res.redirect("/admin/coupon/view-coupons");
  } catch (err) {
    console.error("Error while deleting coupons:", err);
    req.flash("error", "Unexpected error occurred, try again later!");
    res.redirect("back");
  }
});

router.get("/search-coupon", async (req, res) => {
  try {
    const query = req.query.q;
    const coupons = await Coupon.find({
      code: new RegExp(query, "i"),
      isDeleted: false,
    });

    if (coupons.length > 0) {
      return res.render("admin/admin-view-coupons", { coupons });
    } else {
      req.flash("error", "No coupon found with that code");
      return res.redirect("/admin/coupon/view-coupons");
    }
  } catch (err) {
    console.error("An error occurred:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;

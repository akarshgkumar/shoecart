const Coupon = require("../../models/Coupon");

exports.viewCoupons = async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 10,
  };
  try {
    const result = await Coupon.paginate({}, options);
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
};

exports.addCouponGet = (req, res) => {
  res.render("admin/admin-add-coupon");
};

exports.addCouponPost = async (req, res) => {
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
};

exports.editCouponGet = async (req, res) => {
  const couponId = req.params.couponId;
  const coupon = await Coupon.findOne({ _id: couponId });
  if (coupon) {
    res.render("admin/admin-edit-coupon", { coupon });
  } else {
    req.flash("error", "Invalid coupon!");
    res.redirect("back");
  }
};

exports.editCouponPost = async (req, res) => {
  const coupon = await Coupon.findById(req.params.couponId);
  if (!coupon) {
    req.flash("error", "Invalid coupon!");
    return res.redirect("back");
  }
  coupon.code = req.body.coupon_code || coupon.code;
  coupon.discountPercentage = req.body.discount_percentage || coupon.discountPercentage;
  await coupon.save();
  req.flash("success", "Coupon edited successfully");
  res.redirect("/admin/coupon/view-coupons");
};

exports.checkCoupon = async (req, res) => {
  try {
    const { newCouponCode, oldCouponCode } = req.query;
    let coupon = undefined;
    if (newCouponCode === oldCouponCode) {
      coupon = null;
    } else {
      coupon = await Coupon.findOne({
        code: { $regex: `^${newCouponCode}$`, $options: "i" },
      });
    }
    if (coupon) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error("Error while checking coupon:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.showCoupon = async (req, res) => {
  try {
    const couponId = req.params.couponId;
    await Coupon.findByIdAndUpdate(couponId, { $set: { isDeleted: false } });
    res.redirect("back");
  } catch (err) {
    console.error("Error while showing coupon:", err);
    req.flash("error", "Unexpected error occurred, try again later!");
    res.redirect("back");
  }
};

exports.hideCoupon = async (req, res) => {
  try {
    const couponId = req.params.couponId;
    await Coupon.findByIdAndUpdate(couponId, { $set: { isDeleted: true } });
    res.redirect("/admin/coupon/view-coupons");
  } catch (err) {
    console.error("Error while hiding coupon:", err);
    req.flash("error", "Unexpected error occurred, try again later!");
    res.redirect("back");
  }
};

exports.searchCoupon = async (req, res) => {
  try {
    const query = req.query.q;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: 10,
    };
    const filter = {
      code: new RegExp(query, "i"),
    };
    const result = await Coupon.paginate(filter, options);
    if (result.docs.length === 0) {
      req.flash("error", "No coupons found for the given code.");
      return res.redirect("/admin/coupon/view-coupons");
    }
    res.render("admin/admin-view-coupons", {
      coupons: result.docs,
      couponCount: result.totalDocs,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (err) {
    console.error("An error occurred:", err);
    res.status(500).send("Internal Server Error");
  }
};

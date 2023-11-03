const express = require("express");
const router = express.Router();
const parser = require('../../config/cloudinaryConfig');
const bannerController = require("../../controllers/admin/adminBannerController");

// Route to view all banners
router.get("/view-banners", bannerController.viewBanners);

// Route to get a single banner for editing
router.get("/edit-banner/:bannerId", bannerController.getEditBanner);

// Route to submit changes for a single banner
// 'parser.single("banner_img")' is a middleware to parse the uploaded image for the banner
router.post("/edit-banner/:bannerId", parser.single("banner_img"), bannerController.postEditBanner);

module.exports = router;

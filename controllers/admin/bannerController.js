const express = require("express");
const router = express.Router();
const Banner = require("../../models/Banner");
const parser = require('../../config/cloudinaryConfig');

router.get("/view-banners", async (req, res) => {
  const banners = await Banner.find({});
  res.render("admin/admin-view-banners", { banners });
});

router.get("/edit-banner/:bannerId", async (req, res) => {
  res.render("admin/admin-edit-banner", { bannerId: req.params.bannerId });
});

router.post(
  "/edit-banner/:bannerId",
  parser.single("banner_img"),
  async (req, res) => {
    const bannerId = req.params.bannerId;

    try {
      const banner = await Banner.findById(bannerId);

      if (!banner) {
        req.flash("success", "Banner edited successfully");
        return res.redirect("/admin/banner/view-banners");
      }

      let imageUrl = banner.imageUrl;
      console.log('before :', imageUrl);
      console.log(req.file);
      if (req.file) {
        imageUrl = req.file.path; 
      }
      console.log('after :', imageUrl)

      const updatedBannerData = {
        imageUrl: imageUrl,
      };
      console.log('after updating :', imageUrl)

      await Banner.findByIdAndUpdate(bannerId, updatedBannerData);
      req.flash("success", "Banner edited successfully");
      res.redirect("/admin/banner/view-banners"); 
    } catch (err) {
      console.error(err);
      req.flash("error", "Internal server error");
      res.redirect(`/admin/banner/edit-banner/${bannerId}`);
    }
  }
);


module.exports = router;

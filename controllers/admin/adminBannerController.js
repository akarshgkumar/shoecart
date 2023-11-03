const Banner = require("../../models/Banner");

exports.viewBanners = async (req, res) => {
  const banners = await Banner.find({});
  res.render("admin/admin-view-banners", { banners });
};

exports.getEditBanner = async (req, res) => {
  const banner = await Banner.findOne({ _id: req.params.bannerId });
  res.render("admin/admin-edit-banner", { banner });
};

exports.postEditBanner = async (req, res) => {
  const bannerId = req.params.bannerId;

  try {
    const banner = await Banner.findById(bannerId);

    if (!banner) {
      req.flash("success", "Banner edited successfully");
      return res.redirect("/admin/banner/view-banners");
    }

    let imageUrl = banner.imageUrl;
    if (req.file) {
      imageUrl = req.file.path;
    }

    const updatedBannerData = {
      imageUrl: imageUrl,
    };

    await Banner.findByIdAndUpdate(bannerId, updatedBannerData);
    req.flash("success", "Banner edited successfully");
    res.redirect("/admin/banner/view-banners");
  } catch (err) {
    console.error(err);
    req.flash("error", "Internal server error");
    res.redirect(`/admin/banner/edit-banner/${bannerId}`);
  }
};

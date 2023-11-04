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
  const {sub_heading, main_heading, highlighted_heading, small_description} = req.body;

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
      subHeading: sub_heading,
      mainHeading: main_heading,
      highlightedHeading: highlighted_heading,
      description: small_description,
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

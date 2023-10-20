const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    imageUrl: String,
    name: String,
    subHeading: String,
    mainHeading: String,
    HighlightedHeading: String,
    smallDescription: String,
  },
  {
    timestamps: true,
  }
);

const Banner = mongoose.model("Banner", bannerSchema);
module.exports = Banner;

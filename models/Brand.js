const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

brandSchema.plugin(mongoosePaginate);


const Brand = mongoose.model("Brand", brandSchema);

module.exports = Brand;

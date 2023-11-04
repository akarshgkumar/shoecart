const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
    },
    productCount: {
      type: Number,
      default: 0
    },
    isDeleted: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

brandSchema.plugin(mongoosePaginate);


const Brand = mongoose.model("Brand", brandSchema);

module.exports = Brand;

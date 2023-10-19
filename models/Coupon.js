const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    discountPercentage: {
      type: Number,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

couponSchema.plugin(mongoosePaginate);

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;

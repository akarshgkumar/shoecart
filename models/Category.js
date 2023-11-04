const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
    },
    imageUrl: String,
    productCount: {
      type: Number,
      default: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
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

categorySchema.plugin(mongoosePaginate);

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;

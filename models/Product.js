const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const productSchema = new mongoose.Schema(
  {
    shortId: {
      type: String,
      unique: true,
    },
    name: String,
    color: String,
    sizes: [Number],
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    description: String,
    stock: Number,
    price: Number,
    mainImage: String,
    images: [String],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    totalSoldItems: {
      type: Number,
      default: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
    },
    individualDiscountPercentage: {
      type: Number,
      default: 0
    },
    categoryDiscountPercentage: {
      type: Number,
      default: 0,
    },
    priceAfterDiscount: {
      type: Number,
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

productSchema.plugin(mongoosePaginate);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;

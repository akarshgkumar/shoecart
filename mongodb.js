const mongoose = require("mongoose");

mongoose
  .connect("mongodb://localhost:27017/shoecart")
  .then(() => {
    console.log("db connected");
  })
  .catch(() => {
    console.log("db failed");
  });

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phoneNo: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const productSchema = new mongoose.Schema(
  {
    name: String,
    color: String,
    sizes: [Number], // Array to store multiple sizes
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand", // Assuming you have a Brand model
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // Assuming you have a Category model
    },
    description: String,
    stock: Number,
    price: Number,
    mainImage: String, // Separate field for main image
    images: [String],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    estProfit: Number,
  },
  {
    timestamps: true,
  }
);

const categorySchema = new mongoose.Schema(
  {
    name: String,
    isDeleted: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);


const brandSchema = new mongoose.Schema(
  {
    name: String,
    isDeleted: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);
const Category = mongoose.model("Category", categorySchema);
const Brand = mongoose.model("Brand", brandSchema);
const Product = mongoose.model("Product", productSchema);

const adminSchema = new mongoose.Schema({}, { strict: false });

const Admin = mongoose.model("Admin", adminSchema);

const User = mongoose.model("User", userSchema);

module.exports = { User, Admin, Product, Brand, Category };

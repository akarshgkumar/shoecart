const mongoose = require("mongoose");

mongoose
  .connect("mongodb://localhost:27017/shoecart")
  .then(() => {
    console.log("db connected");
  })
  .catch(() => {
    console.log("db failed");
  });

const userSchema = new mongoose.Schema({
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
  }
});

const productSchema = new mongoose.Schema({
  name: String,
  color: String,
  size: String,
  brand: String,
  description: String,
  price: Number,
  category: String,
  images: [String]
});
const Product = mongoose.model('Product', productSchema);

const adminSchema = new mongoose.Schema({}, { strict: false });

const Admin = mongoose.model("Admin", adminSchema);

const User = mongoose.model("User", userSchema);

module.exports = { User, Admin, Product };

const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  address: String,
  addressLine1: String,
  city: String,
  state: String,
  postalCode: Number
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
    },
    password: {
      type: String,
      required: true,
    },
    addresses: [AddressSchema],
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

const User = mongoose.model("User", userSchema);

module.exports = User;

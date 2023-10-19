const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const AddressSchema = new mongoose.Schema({
  address: String,
  addressLine1: String,
  city: String,
  state: String,
  postalCode: Number,
  name: String,
  phoneNo: Number,
  email: String,
  companyName: String,
  default: {
    default: false,
    type: Boolean
  }
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
    wallet: {
      balance: {
        type: mongoose.Schema.Types.Decimal128,
        default: 0
      }
    },
  },
  {
    timestamps: true,
  }
);

userSchema.plugin(mongoosePaginate);

const User = mongoose.model("User", userSchema);

module.exports = User;

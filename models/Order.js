const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        size: { 
          type: Number,
          required: true,
        },
        mainImg: {
          type: String,
          required: true
        },
        name: {
          type: String,
          required: true
        },
        brand: {
          type: String,
          required: true
        }
      },
    ],
    address: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      phoneNo: {
        type: String,
        required: true,
      },
      companyName: String,
      address: {
        type: String,
        required: true,
      },
      addressLine1: String,
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      postalCode: {
        type: String,
        required: true,
      },
    },
    paymentMethod: {
      type: String,
      enum: ["Razor Pay", "Wallet Payment", "Cash On Delivery"],
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    subTotal: {
      type: Number,
      required: true
    },
    isDelivered: {
      type: Boolean,
      default: false,
    },
    isShipped: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      default: 'Processing'
    },
    deliveryDate: Date,
    shippedDate: Date,
    isCancelled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
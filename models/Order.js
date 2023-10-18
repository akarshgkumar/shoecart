const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    shortId: {
      type: String,
      unique: true,
    },
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
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        brand: {
          type: String,
          required: true,
        },
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
    status: {
      type: String,
      enum: ["Processing", "Shipped", "Delivered", "Cancelled", "Returned"],
      default: "Processing",
    },
    razorOrderId: String,
    deliveryDate: Date,
    shippedDate: Date,
    cancelledDate: Date,
    returnDate: Date,
    totalAfterDiscount: Number,
    isPaid: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;

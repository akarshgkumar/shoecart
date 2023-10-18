const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const User = require("../../models/User");
const Order = require("../../models/Order");
const Coupon = require("../../models/Coupon");
const crypto = require("crypto");
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const validator = require("validator");

router.get("/checkout", async (req, res) => {
  try {
    const token = req.cookies.jwt;
    const error = req.query.error;

    if (!token) {
      return res.redirect("/login");
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const cart = await Cart.findOne({ userId }).populate({
      path: "products.productId",
      match: { isDeleted: false },
    });

    let totalPrice = 0;

    const validProducts =
      cart?.products.filter((product) => product.productId) || [];

    const populatedProducts = validProducts.map((product) => {
      const productTotalPrice = product.productId.price * product.quantity;

      totalPrice += productTotalPrice;

      return {
        ...product.productId._doc,
        quantity: product.quantity,
        size: product.size,
        price: productTotalPrice,
      };
    });

    for (const product of validProducts) {
      product.price = product.productId.price * product.quantity;
    }

    await cart.save();

    const user = await User.findById(userId);
    const defaultAddress = user.addresses.find((address) => address.default);

    res.render("user/user-checkout", {
      products: populatedProducts,
      defaultAddress: defaultAddress,
      userId,
      totalPrice,
      error,
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error fetching checkout data:", error);
    res.status(500).send("Internal server error");
  }
});

router.post("/cancel-order", async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);

    if (!order || order.status == "Cancelled") {
      req.flash("error", "Order not found or already cancelled");
      return res.redirect(`/account#orders`);
    }

    order.status = "Cancelled";
    await order.save();

    for (let orderedProduct of order.products) {
      console.log(orderedProduct.product);
      const product = await Product.findById(orderedProduct.product);
      console.log(product);
      product.stock += orderedProduct.quantity;
      await product.save();
    }
    req.flash("success", "Order cancelled successfully");
    res.redirect("/account#orders");
  } catch (err) {
    console.error("Error cancelling order:", err);
    req.flash("error", "Some error occurred");
    res.redirect(`/account#orders`);
  }
});

router.get("/view-single-order/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate(
      "products.product"
    );
    res.render("user/user-view-single-order", { order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).send("Server error");
  }
});

router.get("/select-address", async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.redirect("/login");
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.render("user/select-address", { addresses: user.addresses, userId });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

router.post("/validate-cart", async (req, res) => {
  console.log("Inside /validate-cart");
  try {
    const userId = req.body.userId;
    const cart = await Cart.findOne({ userId }).populate("products.productId");

    if (!cart || cart.products.length === 0) {
      return res.json({ status: "failure", message: "Cart is empty" });
    }

    const validProducts = cart.products.filter(
      (product) => !product.productId.isDeleted
    );

    if (validProducts.length === 0) {
      return res.json({ status: "failure", message: "Cart is empty" });
    }

    let isValid = true;

    for (let i = 0; i < validProducts.length; i++) {
      const productInCart = validProducts[i];
      const actualProduct = await Product.findById(productInCart.productId);

      if (actualProduct.stock < productInCart.quantity) {
        isValid = false;
        break;
      }
    }

    if (isValid) {
      res.json({ status: "success" });
    } else {
      res.json({
        status: "failure",
        message: "Product quantity exceeds stock",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    res.json({ status: "failure", message: "An error occurred" });
  }
});

router.post("/place-order", async (req, res) => {
  const {
    user,
    name,
    email,
    phone,
    cname,
    shipping_address,
    shipping_address2,
    city,
    state,
    zipcode,
    payment_option,
    totalAmount,
    totalAfterDiscount,
  } = req.body;

  if (
    !name ||
    !email ||
    !phone ||
    !shipping_address ||
    !city ||
    !state ||
    !zipcode ||
    !payment_option
  ) {
    req.flash("error", "fill all required fields");
    return res.redirect("/order/checkout");
  }

  try {
    const cart = await Cart.findOne({ userId: user });
    if (!cart) {
      return res.redirect(
        "/order/checkout?error=No%20cart%20found%20for%20the%20user."
      );
    }

    if (payment_option === "Razor Pay") {
      const instance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      const options = {
        amount: parseFloat(totalAfterDiscount) * 100,
        currency: "INR",
      };

      const razorOrder = await instance.orders.create(options);

      return res.json({
        order_id: razorOrder.id,
        amount: totalAfterDiscount * 100,
      });
    }

    let uniqueShortId,
      existingOrder,
      attempts = 0,
      maxAttempts = 10;

    do {
      uniqueShortId = nanoid();
      existingOrder = await Order.findOne({ shortId: uniqueShortId });
      attempts++;
      if (attempts >= maxAttempts) {
        req.flash("error", "Unexpected error occurred, please try again");
        return res.redirect("/order/checkout");
      }
    } while (existingOrder);

    const mappedProducts = await Promise.all(
      cart.products.map(async (cartProduct) => {
        const product = await Product.findById(cartProduct.productId).populate(
          "brand"
        );
        return {
          product: product._id,
          quantity: cartProduct.quantity,
          price: product.price,
          size: cartProduct.size,
          mainImg: product.mainImage,
          name: product.name,
          brand: product.brand.name,
        };
      })
    );

    const newOrder = new Order({
      shortId: uniqueShortId,
      user: user,
      products: mappedProducts,
      address: {
        name,
        email,
        phoneNo: phone,
        companyName: cname,
        address: shipping_address,
        addressLine1: shipping_address2,
        city,
        state,
        postalCode: zipcode,
      },
      paymentMethod: payment_option,
      totalAmount: totalAmount,
      totalAfterDiscount: totalAfterDiscount,
      deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    });

    await newOrder.save();
    for (let cartProduct of cart.products) {
      const product = await Product.findById(cartProduct.productId);
      product.stock -= cartProduct.quantity;
      await product.save();
    }

    await Cart.deleteOne({ userId: user });
    req.flash("success", "Order is successful");
    return res.redirect(`/order/success/${newOrder._id}`);
  } catch (err) {
    if (err.name === "MongoError" && err.code === 11000) {
      req.flash(
        "error",
        "An error occurred while processing your order. Please try again."
      );
    } else {
      req.flash("error", "An error occurred while placing order");
    }
    return res.redirect("/order/checkout");
  }
});

router.post("/validate-order", async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
    req.body;
  const text = razorpay_order_id + "|" + razorpay_payment_id;
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest("hex");

  if (generatedSignature === razorpay_signature) {
    const {
      user,
      name,
      email,
      phone,
      cname,
      shipping_address,
      shipping_address2,
      city,
      state,
      zipcode,
      payment_option,
      totalAmount,
      totalAfterDiscount,
    } = req.body;
    const cart = await Cart.findOne({ userId: user });
    let uniqueShortId,
      existingOrder,
      attempts = 0,
      maxAttempts = 10;

    do {
      uniqueShortId = nanoid();
      existingOrder = await Order.findOne({ shortId: uniqueShortId });
      attempts++;
      if (attempts >= maxAttempts) {
        req.flash("error", "Unexpected error occurred, please try again");
        return res.redirect("/order/checkout");
      }
    } while (existingOrder);

    const mappedProducts = await Promise.all(
      cart.products.map(async (cartProduct) => {
        const product = await Product.findById(cartProduct.productId).populate(
          "brand"
        );
        return {
          product: product._id,
          quantity: cartProduct.quantity,
          price: product.price,
          size: cartProduct.size,
          mainImg: product.mainImage,
          name: product.name,
          brand: product.brand.name,
        };
      })
    );

    const newOrder = new Order({
      razorOrderId: razorpay_order_id,
      shortId: uniqueShortId,
      user: user,
      products: mappedProducts,
      address: {
        name,
        email,
        phoneNo: phone,
        companyName: cname,
        address: shipping_address,
        addressLine1: shipping_address2,
        city,
        state,
        postalCode: zipcode,
      },
      paymentMethod: payment_option,
      totalAmount: totalAmount,
      totalAfterDiscount: totalAfterDiscount,
      isPaid: true,
      deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    });
    await newOrder.save();

    for (let cartProduct of cart.products) {
      const product = await Product.findById(cartProduct.productId);
      product.stock -= cartProduct.quantity;
      await product.save();
    }

    await Cart.deleteOne({ userId: user });

    req.flash("success", "Order is successful");
    return res.redirect(`/order/success/${newOrder._id}`);
  } else {
    req.flash("error", "Payment verification failed");
    return res.redirect("/order/checkout");
  }
});

router.get("/return-reason/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate(
      "products.product"
    );
    res.render("user/user-return-reason", { order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).send("Server error");
  }
});

router.post("/return-reason", async (req, res) => {
  let orderId;

  try {
    let { reason, additionalInfo } = req.body;
    orderId = req.body.orderId;

    const sanitizedAdditionalInfo = validator.escape(additionalInfo);
    const sanitizedReason = validator.escape(reason);

    const validReasons = ["size", "damaged", "color"];

    if (!validReasons.includes(sanitizedReason)) {
      req.flash("error", "Please select a valid return reason");
      return res.redirect(`/view-single-order/${orderId}`);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send({ error: "Order not found" });
    }

    order.returnMsg = sanitizedAdditionalInfo;

    if (sanitizedReason !== "damaged") {
      for (let orderedProduct of order.products) {
        const product = await Product.findById(orderedProduct.product);
        if (product) {
          product.stock += orderedProduct.quantity;
          await product.save();
        }
      }
    }

    order.returnDate = new Date();
    order.status = "Returned";
    await order.save();

    req.flash("success", "Order returned successfully");
    res.redirect(`/order/view-single-order/${orderId}`);
  } catch (error) {
    req.flash("error", "An error occurred, try again later");
    res.redirect(`/order/view-single-order/${orderId}`);
  }
});

router.get("/success/:orderId", (req, res) => {
  res.render("user/order-success", {orderId : req.params.orderId});
});

router.post("/apply-coupon", async (req, res) => {
  const { couponCode } = req.body;

  const coupon = await Coupon.findOne({ code: couponCode });
  if (!coupon) {
    return res.json({ error: "Invalid coupon code." });
  }

  return res.json({ discountPercentage: coupon.discountPercentage });
});

module.exports = router;

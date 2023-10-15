const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const User = require("../models/User");
const Order = require("../models/Order");
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

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

    res.render("user-checkout", {
      products: populatedProducts,
      defaultAddress: defaultAddress,
      userId,
      totalPrice,
      error,
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

    if (!order || order.isCancelled) {
      req.flash("error", "Order not found or already cancelled");
      return res.redirect(`/account#orders`);
    }

    order.isCancelled = true;
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
    req.flash("error", "Some error occured");
    res.redirect(`/account#orders`);
  }
});

router.get("/view-single-order/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate(
      "products.product"
    );
    res.render("user-view-single-order", { order });
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

    res.render("select-address", { addresses: user.addresses, userId });
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
    let uniqueShortId = nanoid();
    let existingOrder = await Order.findOne({ shortId: uniqueShortId });

    while (existingOrder) {
      uniqueShortId = nanoid();
      existingOrder = await Order.findOne({ shortId: uniqueShortId });
    }

    const cart = await Cart.findOne({ userId: user });

    if (!cart) {
      return res.redirect(
        "/order/checkout?error=No%20cart%20found%20for%20the%20user."
      );
    }

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

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 3);

    const order = new Order({
      shortId: uniqueShortId,
      user: user,
      products: mappedProducts,
      address: {
        name: name,
        email: email,
        phoneNo: phone,
        companyName: cname,
        address: shipping_address,
        addressLine1: shipping_address2,
        city: city,
        state: state,
        postalCode: zipcode,
      },
      paymentMethod: payment_option,
      subTotal: parseFloat(totalAmount),
      totalAmount: parseFloat(totalAmount),
      deliveryDate: deliveryDate,
    });

    await order.save();

    for (let cartProduct of cart.products) {
      const product = await Product.findById(cartProduct.productId);
      product.stock -= cartProduct.quantity;
      await product.save();
    }

    await Cart.deleteOne({ userId: user });
    req.flash("success", "Order is successful");
    return res.redirect("/home");
  } catch (err) {
    if (err.name === "MongoError" && err.code === 11000) {
      console.error("Duplicate key error:", err);
      req.flash(
        "error",
        "An error occurred while processing your order. Please try again."
      );
    } else {
      console.error("Error placing order:", err);
      req.flash("error", "An error occurred while placing order");
    }
    return res.redirect("/order/checkout");
  }
});

module.exports = router;
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const Razorpay = require("razorpay");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const User = require("../../models/User");
const Order = require("../../models/Order");
const Coupon = require("../../models/Coupon");
const WalletTransaction = require("../../models/WalletTransaction");
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
      const productTotalPrice =
        product.productId.priceAfterDiscount * product.quantity;

      totalPrice += productTotalPrice;

      return {
        ...product.productId._doc,
        quantity: product.quantity,
        size: product.size,
        price: productTotalPrice,
      };
    });

    for (const product of validProducts) {
      product.price = product.productId.priceAfterDiscount * product.quantity;
    }

    await cart.save();

    const user = await User.findById(userId);
    const defaultAddress = user.addresses.find((address) => address.default);
    const coupons = await Coupon.find({ isDeleted: false }).sort({ discountPercentage: -1 });

    res.render("user/user-checkout", {
      products: populatedProducts,
      defaultAddress: defaultAddress,
      userId,
      totalPrice,
      coupons,
      walletBalance: user.wallet?.balance,
      error,
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error fetching checkout data:", error);
    res.redirect("/home");
  }
});

router.post("/cancel-order", async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    const token = req.cookies.jwt;
    if (!token) {
      return res.redirect("/login");
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
        if (order.totalAmountPaid > 0) {
      await User.findByIdAndUpdate(userId, {
        $inc: { "wallet.balance": order.totalAmountPaid },
      });
      const newWallet = new WalletTransaction({
        userId: userId,
        orderId: orderId,
        type: "addition",
      });
      await newWallet.save();
    }

    if (!order || order.status == "Cancelled") {
      req.flash("error", "Order not found or already cancelled");
      return res.redirect(`/account#orders`);
    }

    order.status = "Cancelled";
    order.cancelledDate = new Date();
    await order.save();

    for (let orderedProduct of order.products) {
            const product = await Product.findById(orderedProduct.product);
            product.stock += orderedProduct.quantity;
      product.totalSoldItems -= orderedProduct.quantity;
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
    let notEnoughProductName;
    let notEnoughProductStock;
    for (let i = 0; i < validProducts.length; i++) {
      const productInCart = validProducts[i];
      const actualProduct = await Product.findById(productInCart.productId);

      if (actualProduct.stock < productInCart.quantity) {
        isValid = false;
        notEnoughProductName = actualProduct.name;
        notEnoughProductStock = actualProduct.stock;
        break;
      }
    }

    if (isValid) {
      res.json({ status: "success" });
    } else {
      res.json({
        status: "failure",
        message: `${notEnoughProductName.slice(
          0,
          25
        )}.. has only ${notEnoughProductStock} stocks left`,
      });
    }
  } catch (error) {
    console.error("Error:", error);
    res.json({ status: "failure", message: "An error occurred" });
  }
});

const calculateAmountAfterWalletUsage = (total, walletBalance) => {
  if (walletBalance >= total) return 0;
  else return total - walletBalance;
};

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
    totalAmount,
    totalAfterDiscount,
  } = req.body;

  let { payment_option } = req.body;
    if (!payment_option) {
    req.flash("error", "Please select a payment method");
    return res.redirect("/order/checkout");
  }

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
    const fetchedUser = await User.findById(user);
    let walletBalance = fetchedUser.wallet?.balance;
        let paidAmountOnWallet = 0;

    if (req.body.walletPayment === "on") {
      const amountAfterWalletUsage = calculateAmountAfterWalletUsage(
        parseFloat(totalAfterDiscount),
        walletBalance
      );

      if (amountAfterWalletUsage === 0) {
        if (
          payment_option === "Razor Pay" ||
          payment_option === "Cash On Delivery"
        ) {
                    payment_option = "Wallet Payment";
          paidAmountOnWallet = parseFloat(totalAfterDiscount);
          walletBalance = walletBalance - paidAmountOnWallet;
        }
      } else if (payment_option === "Razor Pay") {
        const instance = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        const options = {
          amount: parseFloat(amountAfterWalletUsage) * 100,
          currency: "INR",
        };

        const razorOrder = await instance.orders.create(options);

        return res.json({
          order_id: razorOrder.id,
          amount: amountAfterWalletUsage * 100,
        });
      } else {
        paidAmountOnWallet = walletBalance;
        walletBalance = walletBalance - paidAmountOnWallet;
      }
    } else {
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
      } else if (payment_option === "Wallet Payment") {
        paidAmountOnWallet = parseFloat(totalAfterDiscount);
        walletBalance = walletBalance - paidAmountOnWallet;
      }
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
        const product = await Product.findById(cartProduct.productId).populate([
          "brand",
          "category",
        ]);
        return {
          product: product._id,
          quantity: cartProduct.quantity,
          price: product.priceAfterDiscount,
          size: cartProduct.size,
          mainImg: product.mainImage,
          name: product.name,
          brand: product.brand.name,
          category: product.category.name,
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
      totalAmountPaid: paidAmountOnWallet,
      walletPaidAmount: paidAmountOnWallet,
      deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    });

    newOrder.totalItems = newOrder.products.reduce(
      (acc, curr) => acc + curr.quantity,
      0
    );

    await newOrder.save();

    const userOrdersCount = await Order.countDocuments({ user: user });
    const fetchedUserAgain = await User.findById(user);

    if (fetchedUserAgain.referredBy && userOrdersCount === 1) {
      await User.findOneAndUpdate(
        { referralCode: fetchedUserAgain.referredBy },
        {
          $inc: {
            "wallet.balance": 500,
            referralEarnings: 500,
          },
        }
      );
      await User.findByIdAndUpdate(fetchedUserAgain._id, {
        $inc: {
          "wallet.balance": 250,
        },
      });
    }

        for (let cartProduct of cart.products) {
      const product = await Product.findById(cartProduct.productId);
      product.stock -= cartProduct.quantity;
      product.totalSoldItems += cartProduct.quantity;
      await product.save();
    }
        if (paidAmountOnWallet > 0) {
      await User.findByIdAndUpdate(user, {
        $inc: { "wallet.balance": -paidAmountOnWallet },
      });
      const newWallet = new WalletTransaction({
        userId: user,
        orderId: newOrder._id,
        type: "subtraction",
      });
      await newWallet.save();
    }
    await Cart.deleteOne({ userId: user });
        req.flash("success", "Order is successful");
            return res.redirect(`/order/success/${newOrder._id}`);
  } catch (err) {
    console.error(err);
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

  if (!req.body.razorpay_paid_amount) {
        return;
  }

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
      razorpay_paid_amount,
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
        const product = await Product.findById(cartProduct.productId).populate([
          "brand",
          "category",
        ]);
        return {
          product: product._id,
          quantity: cartProduct.quantity,
          price: product.priceAfterDiscount,
          size: cartProduct.size,
          mainImg: product.mainImage,
          name: product.name,
          brand: product.brand.name,
          category: product.category.name,
        };
      })
    );
        
    const amountPaidThroughWallet =
      parseFloat(totalAfterDiscount) - parseFloat(razorpay_paid_amount);
    
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
      walletPaidAmount: amountPaidThroughWallet,
      totalAmountPaid: totalAfterDiscount,
      isPaid: true,
      deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    });

    newOrder.totalItems = newOrder.products.reduce(
      (acc, curr) => acc + curr.quantity,
      0
    );

    await newOrder.save();

    const userOrdersCount = await Order.countDocuments({ user: user });
    const fetchedUserAgain = await User.findById(user);

    if (fetchedUserAgain.referredBy && userOrdersCount === 1) {
      await User.findOneAndUpdate(
        { referralCode: fetchedUserAgain.referredBy },
        {
          $inc: {
            "wallet.balance": 500,
            referralEarnings: 500,
          },
        }
      );
      await User.findByIdAndUpdate(fetchedUserAgain._id, {
        $inc: {
          "wallet.balance": 250,
        },
      });
    }

    if (amountPaidThroughWallet > 0) {
      await User.findByIdAndUpdate(user, {
        $inc: { "wallet.balance": -amountPaidThroughWallet },
      });
      const newWallet = new WalletTransaction({
        userId: user,
        orderId: newOrder._id,
        type: "subtraction",
      });
      await newWallet.save();
    }

    for (let cartProduct of cart.products) {
      const product = await Product.findById(cartProduct.productId);
      product.stock -= cartProduct.quantity;
      product.totalSoldItems += cartProduct.quantity;
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
    const token = req.cookies.jwt;
    if (!token) {
      return res.redirect("/login");
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
        const sanitizedAdditionalInfo = validator.escape(additionalInfo);
    const validReasons = ["size", "damaged", "color"];

    if (!validReasons.includes(reason)) {
      req.flash("error", "Please select a valid return reason");
      return res.redirect(`/order/return-reason/${orderId}`);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      req.flash("error", "Order cannot found !");
      return res.redirect(`/order/view-single-order/${orderId}`);
    }
    await User.findByIdAndUpdate(userId, {
      $inc: { "wallet.balance": order.totalAfterDiscount },
    });
    const newWallet = new WalletTransaction({
      userId: userId,
      orderId: orderId,
      type: "addition",
    });
    await newWallet.save();

    order.returnMsg = sanitizedAdditionalInfo;
    
    if (reason !== "damaged") {
      for (let orderedProduct of order.products) {
        const product = await Product.findById(orderedProduct.product);
        if (product) {
          product.stock += orderedProduct.quantity;
          await product.save();
        }
      }
    }

    for (let orderedProduct of order.products) {
      const product = await Product.findById(orderedProduct.product);
      if (product) {
        product.totalSoldItems -= orderedProduct.quantity;
        await product.save();
      }
    }

    order.returnDate = new Date();
    order.status = "Returned";
    await order.save();
        req.flash("success", "Order returned successfully");
    res.redirect(`/order/view-single-order/${orderId}`);
  } catch (error) {
    console.error(error);
        req.flash("error", "An error occurred, try again later");
    res.redirect(`/order/view-single-order/${orderId}`);
  }
});

router.get("/success/:orderId", (req, res) => {
      res.render("user/order-success", { orderId: req.params.orderId });
});

router.post("/apply-coupon", async (req, res) => {
  const { couponCode } = req.body;

  const coupon = await Coupon.findOne({ code: couponCode, isDeleted: false });
  if (!coupon) {
    return res.json({ error: "Invalid or expired coupon code." });
  }

  return res.json({ discountPercentage: coupon.discountPercentage });
});

router.get("/invoices/download", async (req, res) => {
  try {
    const id = req.query.orderId;
    const order = await Order.findById(id).populate("products.product");
    const templatePath = path.resolve(__dirname, "../../public/templates/invoice.ejs");
    
    const ejsData = await ejs.renderFile(templatePath, { order });

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(ejsData);
    
    const pdfOptions = {
      format: "A3",
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm"
      }
    };
    const pdfBuffer = await page.pdf(pdfOptions);
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.shortId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send(`Server Error: ${error.message}`);
  }
});


module.exports = router;

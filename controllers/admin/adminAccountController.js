const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Admin = require("../../models/Admin");
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const User = require("../../models/User");
const Category = require("../../models/Category");
const JWT_SECRET = process.env.JWT_SECRET;
const authenticateAdmin = require("../../middlewares/admin/authenticateAdmin");

router.get("/", async (req, res) => {
  const adminToken = req.cookies.adminJwt;

  if (adminToken) {
    try {
      jwt.verify(adminToken, JWT_SECRET);
      res.redirect("/admin/dashboard");
    } catch (err) {
      res.render("admin/admin-login");
    }
  } else {
    res.redirect("/admin/admin-login");
  }
});

router.post("/", async (req, res) => {
  const { userName, password } = req.body;
  const admin = await Admin.findOne({ userName });
  if (admin && (await bcrypt.compare(password, admin.password))) {
    const adminToken = jwt.sign({ userName: admin.userName }, JWT_SECRET, {
      expiresIn: "730d",
    });
    res.cookie("adminJwt", adminToken, {
      httpOnly: true,
      maxAge: 730 * 24 * 60 * 60 * 1000,
    });
    res.redirect("/admin/dashboard");
  } else {
    res.render("admin/admin-login", {
      notFound: "Incorrect username or password",
    });
  }
});

router.use(authenticateAdmin);

router.get("/dashboard", async (req, res) => {
  try {
    const orders = await Order.find();
    const orderCount = orders.length;
    const currentYear = new Date().getFullYear();
    const startYear = 2023;
    const yearData = await Order.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const currentDate = new Date();
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
    const endOfYear = new Date(currentDate.getFullYear(), 11, 31);

    const monthData = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfYear,
            $lte: endOfYear,
          },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const categoryData = await Order.aggregate([
      {
        $match: {
          status: { $nin: ["Cancelled", "Returned"] },
        },
      },
      { $unwind: "$products" },
      {
        $group: {
          _id: {
            category: "$products.category",
          },
          count: { $sum: "$products.quantity" },
        },
      },
    ]);

    const paymentMethodCounts = await Order.aggregate([
      { $group: { _id: "$paymentMethod", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    console.log("month data :", monthData);

    const productCount = await Product.countDocuments();
    const userCount = await User.countDocuments({ verified: true });
    const categoryCount = await Category.countDocuments();
    const products = await Product.find()
      .populate(["category", "brand"])
      .sort({ totalSoldItems: -1 })
      .limit(8);
    const totalRevenue = orders.reduce((acc, order) => {
      return acc + parseFloat(order.totalAmountPaid.toString());
    }, 0);

    const orderStatuses = (await Order.distinct("status")).sort();
    const orderStatusCounts = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.render("admin/admin-dashboard", {
      orders: orders,
      orderCount: orderCount,
      orderStatuses,
      orderStatusCounts,
      monthData,
      categoryData,
      paymentMethodCounts,
      productCount: productCount,
      userCount: userCount,
      categoryCount: categoryCount,
      totalRevenue: totalRevenue,
      products: products,
      yearData: yearData,
      currentYear: currentYear,
      startYear: startYear,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("adminJwt");
  res.redirect("/admin");
});

module.exports = router;

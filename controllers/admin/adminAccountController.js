const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const puppeteer = require("puppeteer");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
const Admin = require("../../models/Admin");
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const User = require("../../models/User");
const Category = require("../../models/Category");
const excel = require("excel4node");
const SalesReport = require("../../models/SalesReport");
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
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productData",
        },
      },
      {
        $unwind: "$productData",
      },
      {
        $group: {
          _id: {
            category: "$productData.category",
          },
          count: { $sum: "$products.quantity" },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id.category",
          foreignField: "_id",
          as: "categoryData",
        },
      },
      {
        $unwind: "$categoryData",
      },
      {
        $project: {
          category: "$categoryData.name",
          count: 1,
        },
      },
    ]);

    const paymentMethodCounts = await Order.aggregate([
      { $group: { _id: "$paymentMethod", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const productCount = await Product.countDocuments();
    const userCount = await User.countDocuments({ verified: true });
    const categoryCount = await Category.countDocuments();
    const products = await Product.find()
      .populate(["category", "brand"])
      .sort({ totalSoldItems: -1 })
      .limit(8);
    const totalRevenue = orders
      .filter(
        (order) => order.status !== "Returned" && order.status !== "Cancelled"
      )
      .reduce((acc, order) => {
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

router.post("/sales/report", async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    endDateTime.setHours(23, 59, 59, 999);
    const orders = await Order.find({
      createdAt: {
        $gte: startDateTime,
        $lte: endDateTime,
      },
    });

    const totalOrders = orders.length;

    const totalSales = orders.reduce(
      (acc, order) => acc + parseFloat(order.totalAmountPaid.toString()),
      0
    );

    const deliveredOrders = orders.filter(
      (order) => order.status === "Delivered"
    );
    const totalDeliveredOrders = deliveredOrders.length;

    const cancelledOrders = orders.filter(
      (order) => order.status === "Cancelled"
    );
    const totalCancelledOrders = cancelledOrders.length;

    const returnedOrders = orders.filter(
      (order) => order.status === "Returned"
    );
    const totalReturnedOrders = returnedOrders.length;

    const processingOrders = orders.filter(
      (order) => order.status === "Processing"
    );
    const totalProcessingOrders = processingOrders.length;

    const shippedOrders = orders.filter((order) => order.status === "Shipped");
    const totalShippedOrders = shippedOrders.length;

    const revenueOrders = orders.filter(
      (order) => order.status !== "Returned" && order.status !== "Cancelled"
    );
    const totalRevenue = revenueOrders.reduce(
      (acc, order) => acc + parseFloat(order.totalAmountPaid.toString()),
      0
    );

    // Product, Category, Brand aggregation
    const productAggregation = await Order.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          totalSalesAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "Cancelled"] },
                    { $ne: ["$status", "Returned"] },
                  ],
                },
                { $multiply: ["$products.price", "$products.quantity"] },
                0,
              ],
            },
          },
          unitsSold: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "Cancelled"] },
                    { $ne: ["$status", "Returned"] },
                  ],
                },
                "$products.quantity",
                0,
              ],
            },
          },
          cancelledCount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Cancelled"] },
                "$products.quantity",
                0,
              ],
            },
          },
          returnedCount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Returned"] },
                "$products.quantity",
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productData",
        },
      },
      {
        $unwind: "$productData",
      },
      {
        $project: {
          name: "$productData.name",
          totalSalesAmount: 1,
          unitsSold: 1,
          cancelledCount: 1,
          returnedCount: 1,
        },
      },
    ]);

    const categoryAggregation = await Order.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          totalSalesAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "Cancelled"] },
                    { $ne: ["$status", "Returned"] },
                  ],
                },
                { $multiply: ["$products.price", "$products.quantity"] },
                0,
              ],
            },
          },
          unitsSold: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "Cancelled"] },
                    { $ne: ["$status", "Returned"] },
                  ],
                },
                "$products.quantity",
                0,
              ],
            },
          },
          cancelledCount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Cancelled"] },
                "$products.quantity",
                0,
              ],
            },
          },
          returnedCount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Returned"] },
                "$products.quantity",
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productData",
        },
      },
      { $unwind: "$productData" },
      {
        $group: {
          _id: "$productData.category",
          totalSalesAmount: { $sum: "$totalSalesAmount" },
          unitsSold: { $sum: "$unitsSold" },
          cancelledCount: { $sum: "$cancelledCount" },
          returnedCount: { $sum: "$returnedCount" },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryData",
        },
      },
      { $unwind: "$categoryData" },
      {
        $project: {
          name: "$categoryData.name",
          totalSalesAmount: 1,
          unitsSold: 1,
          cancelledCount: 1,
          returnedCount: 1,
        },
      },
    ]);

    const brandAggregation = await Order.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          totalSalesAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "Cancelled"] },
                    { $ne: ["$status", "Returned"] },
                  ],
                },
                { $multiply: ["$products.price", "$products.quantity"] },
                0,
              ],
            },
          },
          unitsSold: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "Cancelled"] },
                    { $ne: ["$status", "Returned"] },
                  ],
                },
                "$products.quantity",
                0,
              ],
            },
          },
          cancelledCount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Cancelled"] },
                "$products.quantity",
                0,
              ],
            },
          },
          returnedCount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Returned"] },
                "$products.quantity",
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productData",
        },
      },
      { $unwind: "$productData" },
      {
        $group: {
          _id: "$productData.brand",
          totalSalesAmount: { $sum: "$totalSalesAmount" },
          unitsSold: { $sum: "$unitsSold" },
          cancelledCount: { $sum: "$cancelledCount" },
          returnedCount: { $sum: "$returnedCount" },
        },
      },
      {
        $lookup: {
          from: "brands",
          localField: "_id",
          foreignField: "_id",
          as: "brandData",
        },
      },
      { $unwind: "$brandData" },
      {
        $project: {
          name: "$brandData.name",
          totalSalesAmount: 1,
          unitsSold: 1,
          cancelledCount: 1,
          returnedCount: 1,
        },
      },
    ]);

    const formatDate = (date) => {
      const d = new Date(date);
      const day = ("0" + d.getDate()).slice(-2);
      const month = ("0" + (d.getMonth() + 1)).slice(-2);
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    let reportDate;
    if (startDate === endDate) {
      reportDate = formatDate(startDate);
    } else {
      reportDate = `${formatDate(startDate)}-${formatDate(endDate)}`;
    }

    const reportData = new SalesReport({
      date: reportDate,
      totalOrders,
      totalSales,
      totalDeliveredOrders,
      totalCancelledOrders,
      totalProcessingOrders,
      totalReturnedOrders,
      totalShippedOrders,
      totalRevenue,
      categories: categoryAggregation,
      brands: brandAggregation,
      products: productAggregation,
    });

    await reportData.save();

    res.render("admin/admin-report-summary", {
      data: orders,
      doc: reportData,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Sorry, Server Error");
    res.redirect("/admin/dashboard");
  }
});

router.get("/download/sales/report/pdf/:reportId", async (req, res) => {
  try {
    const report = await SalesReport.findById(req.params.reportId);
    if (!report) {
      req.flash("error", "Report not found");
      return res.redirect("/admin/dashboard");
    }

    const templatePath = path.resolve(
      __dirname,
      "../../public/templates/sales-report.ejs"
    );
    const content = await ejs.renderFile(templatePath, {
      doc: report,
    });

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(content);

    const salesReportDirectory = path.resolve(
      __dirname,
      "../../sales-reports/"
    );
    if (!fs.existsSync(salesReportDirectory)) {
      fs.mkdirSync(salesReportDirectory);
    }
    const pdfFilePath = path.resolve(
      salesReportDirectory,
      `${report.date}.pdf`
    );

    await page.pdf({
      path: pdfFilePath,
      format: "A3",
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
    });

    await browser.close();

    res.download(
      pdfFilePath,
      `sales_report_${report.date}.pdf`,
      (downloadError) => {
        if (downloadError) {
          console.error(downloadError);
          return res
            .status(500)
            .send(`Download failed: ${downloadError.message}`);
        }

        fs.unlinkSync(pdfFilePath);
      }
    );
  } catch (error) {
    console.error(error);
    req.flash("error", "Sorry, Server error occurred");
    res.redirect("back");
  }
});

router.get("/download/sales/report/excel/:reportId", async (req, res) => {
  try {
    const doc = await SalesReport.findById(req.params.reportId);
    const workbook = new excel.Workbook();
    const options = {
      sheetProtection: {
        autoFilter: true,
        deleteColumns: true,
        deleteRows: true,
        formatCells: true,
        formatColumns: true,
        formatRows: true,
        insertColumns: true,
        insertHyperlinks: true,
        insertRows: true,
        objects: true,
        pivotTables: true,
        scenarios: true,
        selectLockedCells: true,
        selectUnlockedCells: true,
        sheet: true,
        sort: true,
      },
    };
    const categoriesSheet = workbook.addWorksheet("Categories");
    const brandsSheet = workbook.addWorksheet("Brands");
    const productsSheet = workbook.addWorksheet("Products");
    const columnHeading = workbook.createStyle({
      font: {
        bold: true,
        size: 12,
      },
    });
    const style = workbook.createStyle({
      font: {
        size: 12,
      },
    });
    const generateSheet = (sheet, data) => {
      let row = 1;
      sheet.cell(row, 1).string("Name").style(columnHeading);
      sheet.cell(row, 2).string("Total Sales Amount").style(columnHeading);
      sheet.cell(row, 3).string("Units Sold").style(columnHeading);
      sheet.cell(row, 4).string("Cancelled Count").style(columnHeading);
      sheet.cell(row, 5).string("Returned Count").style(columnHeading);
      row++;
      for (const item of data) {
        sheet.cell(row, 1).string(item.name).style(style);
        sheet.cell(row, 2).number(item.totalSalesAmount).style(style);
        sheet.cell(row, 3).number(item.unitsSold).style(style);
        sheet.cell(row, 4).number(item.cancelledCount).style(style);
        sheet.cell(row, 5).number(item.returnedCount).style(style);
        row++;
      }
    };

    generateSheet(categoriesSheet, doc.categories);
    generateSheet(brandsSheet, doc.brands);
    generateSheet(productsSheet, doc.products);

    const reportsDir = path.join(__dirname, "..", "..", "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir);
    }

    await workbook.write(
      path.join(reportsDir, `${doc.date}-sales-report.xlsx`)
    );
    res.download(
      path.join(reportsDir, `${doc.date}-sales-report.xlsx`),
      `${doc.date}-sales-report.xlsx`,
      (err) => {
        if (err) {
          console.error("File download failed:", err);
          req.flash("error", "File download failed");
          return res.redirect("back");
        }
      }
    );

    // Listen to the finish event on the response
    res.on("finish", () => {
      // Delete the file once the response is finished
      fs.unlink(
        path.join(reportsDir, `${doc.date}-sales-report.xlsx`),
        (err) => {
          if (err) console.error("Error deleting the file:", err);
        }
      );
    });
  } catch (error) {
    console.error("An error occurred:", error);
    req.flash("error", "Internal server error");
    res.redirect("back");
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("adminJwt");
  res.redirect("/admin");
});

module.exports = router;

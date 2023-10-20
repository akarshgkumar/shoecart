const express = require("express");
const router = express.Router();
const Product = require("../../models/Product");
const Category = require("../../models/Category");
const Brand = require("../../models/Brand");
const User = require("../../models/User");
const Order = require("../../models/Order");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const Admin = require("../../models/Admin");
const JWT_SECRET = process.env.JWT_SECRET;
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);
const parser = require('../../config/cloudinaryConfig');

function authenticateAdmin(req, res, next) {
  const token = req.cookies.adminJwt;
  if (!token) {
    return res.redirect("/admin");
  }

  jwt.verify(token, JWT_SECRET, (err, admin) => {
    if (err) {
      return res.redirect("/admin");
    }
    next();
  });
}

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
    res.render("admin/admin-login");
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

router.get("/dashboard", (req, res) => {
  res.render("admin/admin-dashboard");
});

router.get("/logout", (req, res) => {
  res.clearCookie("adminJwt");
  res.redirect("/admin");
});

router.get("/view-products", async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 8,
    populate: ["category", "brand"],
    customLabels: {
      docs: "products",
      totalDocs: "productCount",
    },
  };

  try {
    const filter = {
      isDeleted: false,
      brand: { $exists: true, $ne: null },
      category: { $exists: true, $ne: null },
    };
    const result = await Product.paginate(filter, options);

    res.render("admin/admin-view-products", {
      products: result.products,
      productCount: result.productCount,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    req.flash("error", "Error fetching products");
    res.redirect("/admin-home");
  }
});

router.get("/view-single-order/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate(
      "products.product"
    );
    console.log(order);
    res.render("admin/admin-view-single-order", { order });
  } catch (error) {
    console.error("Error fetching order:", error);
    req.flash("error", "Sorry, Server Error");
    res.redirect("/admin/view-orders");
  }
});

router.get("/edit-product/:productId", async (req, res) => {
  const productId = req.params.productId;
  const product = await Product.findOne({ _id: productId });
  const category = await Category.find({ isDeleted: false });
  const brands = await Brand.find({ isDeleted: false });
  if (product) {
    res.render("admin/admin-edit-product", { product, category, brands });
  } else {
    req.flash("error", "Invalid product");
    res.redirect("/admin/view-products");
  }
});

router.post(
  "/edit-product/:productId",
  parser.fields([
    { name: "image", maxCount: 3 },
    { name: "mainImage", maxCount: 1 },
  ]),
  async (req, res) => {
    const productId = req.params.productId;
    try {
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).send("Product not found");
      }

      const sizes = req.body.product_sizes || [];
      const numericSizes = sizes.map(Number);
      const updatedProductData = {
        name: req.body.product_name,
        color: req.body.product_color,
        sizes: numericSizes,
        category: new mongoose.Types.ObjectId(req.body.product_category),
        brand: new mongoose.Types.ObjectId(req.body.product_brand),
        description: req.body.description,
        price: req.body.price,
        stock: req.body.stock,
        mainImage:
          req.files.mainImage && req.files.mainImage[0]
            ? req.files.mainImage[0].path
            : product.mainImage,
      };

      const newImageUrls = req.files.image
        ? req.files.image.slice(1).map((file) => file.path)
        : [];

      const retainedImages = [];
      for (let i = 0; i < product.images.length; i++) {
        const deleteCheckbox = req.body[`deleteImage${i}`];
        if (deleteCheckbox === "on") {
          retainedImages.push(product.images[i]);
        }
      }

      const allImageUrls = retainedImages.concat(newImageUrls);
      if (allImageUrls.length > 3) {
        req.flash("error", "Only submit 3 sub images");
        return res.redirect(`/admin/edit-product/${productId}`);
      }
      if (allImageUrls) updatedProductData.images = allImageUrls;

      await Product.findByIdAndUpdate(productId, updatedProductData);
      req.flash("success", "Product edited successfully");
      res.redirect("/admin/view-products");
    } catch (err) {
      console.error(err);
      req.flash("error", "Internal server error");
      res.redirect(`/admin/edit-product/${productId}`);
    }
  }
);

router.get("/delete-product/:productId", async (req, res) => {
  await Product.findByIdAndUpdate(req.params.productId, { isDeleted: true });
  res.redirect("/admin/view-products");
});

router.get("/search-product", async (req, res) => {
  const searchTerm = req.query.q;
  const products = await Product.find({
    name: new RegExp(searchTerm, "i"),
    isDeleted: false,
  });
  res.render("admin/admin-view-products", { products });
});

router.get("/add-product", async (req, res) => {
  const category = await Category.find({ isDeleted: false });
  const brands = await Brand.find({ isDeleted: false });
  res.render("admin/admin-add-product", { category, brands });
});

router.post(
  "/add-product",
  parser.fields([
    { name: "image", maxCount: 3 },
    { name: "mainImage", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      let uniqueShortId;
      let existingProduct;
      let retryLimit = 10;
      let retryCount = 0;

      do {
        uniqueShortId = nanoid();
        try {
          existingProduct = await Product.findOne({ shortId: uniqueShortId });
        } catch (dbError) {
          console.error("Error querying the database:", dbError);
          req.flash(
            "error",
            "Failed to check product uniqueness. Please try again."
          );
          return res.redirect("/admin/add-product");
        }
        retryCount++;
      } while (existingProduct && retryCount < retryLimit);

      if (retryCount === retryLimit) {
        console.error(
          "Reached maximum retry limit when generating a unique shortId."
        );
        req.flash(
          "error",
          "Failed to generate a unique product ID. Please try again later."
        );
        return res.redirect("/admin/add-product");
      }

      let imageUrls = req.files.image
        ? req.files.image.map((file) => file.path)
        : [];

      const product = new Product({
        shortId: uniqueShortId,
        name: req.body.product_name,
        color: req.body.product_color,
        size: req.body.product_size,
        category: new mongoose.Types.ObjectId(req.body.product_category),
        brand: new mongoose.Types.ObjectId(req.body.product_brand),
        description: req.body.description,
        stock: req.body.stock,
        price: req.body.price,
        mainImage:
          req.files.mainImage && req.files.mainImage[0]
            ? req.files.mainImage[0].path
            : undefined,
        images: imageUrls,
      });

      const result = await product.save();
      console.log("result :", result);
      req.flash("success", "Product added successfully");
      res.redirect("/admin/view-products");
    } catch (err) {
      console.log("Error while adding product:", err);
      req.flash("error", "Internal server error. Failed to add the product.");
      res.redirect("/admin/add-product");
    }
  }
);

router.get("/edit-brand/:brandId", async (req, res) => {
  const brandId = req.params.brandId;
  const brand = await Brand.findOne({ _id: brandId });
  if (brand) {
    res.render("admin/admin-edit-brand", { brand });
  } else {
    res.send("invalid brand");
  }
});

router.get("/edit-category/:categoryId", async (req, res) => {
  const category = await Category.findById(req.params.categoryId);
  if (category) {
    res.render("admin/admin-edit-category", { category });
  } else {
    res.send("Invalid category");
  }
});

router.post("/edit-category/:categoryId", async (req, res) => {
  const categoryId = req.params.categoryId;
  try {
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).send("category not found");
    }

    const updatedcategoryData = {
      name: req.body.category_name,
    };

    await Category.findByIdAndUpdate(categoryId, updatedcategoryData);

    res.redirect("/admin/view-category");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/edit-brand/:brandId", async (req, res) => {
  const brand = await Brand.findById(req.params.brandId);
  if (!brand) {
    return res.status(404).send("Brand not found");
  }
  brand.name = req.body.brand_name || brand.name;
  await brand.save();
  res.redirect("/admin/view-brands");
});

router.get("/view-brands", async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 10,
  };

  const filter = { isDeleted: false };

  try {
    const result = await Brand.paginate(filter, options);
    res.render("admin/admin-view-brands", {
      brands: result.docs,
      brandCount: result.totalDocs,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (err) {
    console.error("Error fetching brands:", err);
    res.redirect("/admin-home");
  }
});

router.get("/view-category", async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 10,
  };

  const filter = { isDeleted: false };

  try {
    const result = await Category.paginate(filter, options);
    res.render("admin/admin-view-category", {
      category: result.docs,
      categoryCount: result.totalDocs,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.redirect("/admin-home");
  }
});

router.get("/add-category", (req, res) => {
  res.render("admin/admin-add-category");
});

router.get("/add-brands", (req, res) => {
  res.render("admin/admin-add-brands");
});

router.post("/add-category", async (req, res) => {
  try {
    const newCategory = new Category({
      name: req.body.category_name,
    });
    await newCategory.save();
    res.redirect("/admin/view-category");
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).send("Category name already exists");
    }
    console.error("Error while adding category:", err);
    res.end("error", err);
  }
});

router.post("/add-brands", async (req, res) => {
  try {
    const newBrand = new Brand({
      name: req.body.brand_name,
    });
    await newBrand.save();
    res.redirect("/admin/view-brands");
  } catch (err) {
    console.error("Error while adding brand:", err);
    res.end("error", err);
  }
});

router.get("/check-category/:name", async (req, res) => {
  try {
    const category = await Category.findOne({
      name: { $regex: `^${req.params.name}$`, $options: "i" },
    });
    console.log(category);
    if (category) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/check-brand/:name", async (req, res) => {
  try {
    const brand = await Brand.findOne({
      name: { $regex: `^${req.params.name}$`, $options: "i" },
    });
    console.log(brand);
    if (brand) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/delete-category/:categoryId", async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    await Product.updateMany(
      { category: categoryId },
      { $set: { category: null } }
    );
    await Category.findByIdAndUpdate(categoryId, { $set: { isDeleted: true } });
    res.redirect("/admin/view-category");
  } catch (err) {
    console.error("Error while deleting category:", err);
    res.status(500).send("Error occurred while deleting the category.");
  }
});

router.get("/add-stock/:productId", async (req, res) => {
  const productId = req.params.productId;
  const product = await Product.findOne({ _id: productId }, "stock");
  console.log(product);
  res.render("admin/admin-add-stock", { productId, stock: product.stock });
});

router.post("/add-stock/:productId", async (req, res) => {
  try {
    const { stock_no } = req.body;
    const productId = req.params.productId;

    await Product.findByIdAndUpdate(productId, {
      $inc: { stock: stock_no },
    });

    res.redirect("/admin/view-products");
  } catch (err) {
    console.error("Error while updating stock:", err);
    res.status(500).send("Server error");
  }
});

router.get("/delete-brand/:brandsId", async (req, res) => {
  try {
    const brandId = req.params.brandsId;
    await Product.updateMany({ brand: brandId }, { $set: { brand: null } });
    await Brand.findByIdAndUpdate(brandId, { $set: { isDeleted: true } });
    res.redirect("/admin/view-brands");
  } catch (err) {
    console.error("Error while deleting brands:", err);
    res.status(500).send("Error occurred while deleting the brands.");
  }
});

router.get("/search-category", async (req, res) => {
  const searchTerm = req.query.q;
  const category = await Category.find({
    name: new RegExp(searchTerm, "i"),
  });
  res.render("admin/admin-view-category", { category });
});

router.get("/search-brands", async (req, res) => {
  const searchTerm = req.query.q;
  const brands = await Brand.find({
    name: new RegExp(searchTerm, "i"),
  });
  res.render("admin/admin-view-brands", { brands });
});

router.get("/search-users", async (req, res) => {
  const searchTerm = req.query.q;
  const users = await User.find({
    name: new RegExp(searchTerm, "i"),
    verified: true,
  });
  res.render("admin/admin-view-users", { users });
});

router.get("/view-users", async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 10,
    customLabels: {
      docs: "users",
      totalDocs: "userCount",
    },
  };

  const filter = { verified: true };

  try {
    const result = await User.paginate(filter, options);
    res.render("admin/admin-view-users", {
      users: result.users,
      userCount: result.userCount,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.redirect("/admin-home");
  }
});

router.get("/unblock-user/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("Invalid User ID");
    }
    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked: false },
      { new: true }
    );
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.redirect("/admin/view-users");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.get("/block-user/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("Invalid User ID");
    }
    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked: true },
      { new: true }
    );
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.redirect("/admin/view-users");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.get("/view-orders", async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 10,
    populate: ["user", "products.product"],
    customLabels: {
      docs: "orders",
      totalDocs: "orderCount",
    },
  };

  try {
    const result = await Order.paginate({}, options);

    res.render("admin/admin-view-orders", {
      orders: result.orders,
      orderCount: result.orderCount,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).send("Internal server error");
  }
});

function formatDate(date) {
  const d = new Date(date);
  let month = "" + (d.getMonth() + 1);
  let day = "" + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [year, month, day].join("-");
}
router.get("/edit-order/:orderId", async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("admin/admin-edit-order", {
      order: order,
      formatDate: formatDate,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

router.post("/edit-order/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { order_name, shipped_date, delivery_date, status, order_email } =
      req.body;

    const order = await Order.findById(id);

    if (!order) {
      req.flash("error", "Order not found");
      return res.redirect("/admin/view-orders");
    }

    let updateFields = {
      "address.name": order_name,
      "address.email": order_email,
      shippedDate: shipped_date,
      deliveryDate: delivery_date,
      status: status,
    };

    if (status === "Cancelled" || status === "Returned") {
      updateFields[`${status.toLowerCase()}Date`] = new Date();

      for (let orderedProduct of order.products) {
        const product = await Product.findById(orderedProduct.product);
        product.stock += orderedProduct.quantity;
        await product.save();
      }
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, updateFields, {
      new: true,
    });

    await updatedOrder.save();

    if (updatedOrder) {
      req.flash("success", "Order updated successfully");
      res.redirect("/admin/view-orders");
    } else {
      req.flash("error", "Failed to update Order");
      res.redirect("/admin/view-orders");
    }
  } catch (error) {
    console.error("Error updating order:", error);
    req.flash("error", "An error occurred while updating the order.");
    res.redirect("/admin/view-orders");
  }
});

router.get("/search-orders", async (req, res) => {
  try {
    const searchQuery = req.query.searchQuery;

    if (mongoose.Types.ObjectId.isValid(searchQuery)) {
      const orders = await Order.find({ _id: searchQuery }).exec();

      if (orders.length > 0) {
        return res.render("admin/admin-view-orders", { orders });
      } else {
        req.flash("error", "No orders found");
        return res.redirect("/admin/view-orders");
      }
    } else {
      req.flash("error", "Invalid ID format");
      return res.redirect("/admin/view-orders");
    }
  } catch (error) {
    console.error("Search error:", error);
    req.flash("error", "Unexpected Error");
    res.redirect("/admin/view-orders");
  }
});

router.get("/search-order-email", async (req, res) => {
  try {
    const emailQuery = req.query.emailQuery;
    const orders = await Order.find({
      "address.email": new RegExp(emailQuery, "i"),
    });

    if (orders.length > 0) {
      return res.render("admin/admin-view-orders", { orders });
    } else {
      req.flash("error", "No orders found with that email");
      return res.redirect("/admin/view-orders");
    }
  } catch (error) {
    console.error("Search error:", error);
    req.flash("error", "Unexpected Error");
    return res.redirect("/admin/view-orders");
  }
});

module.exports = router;

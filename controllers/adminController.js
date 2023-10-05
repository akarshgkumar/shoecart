require("dotenv").config();
const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const Brand = require("../models/Brand");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const JWT_SECRET = process.env.JWT_SECRET;
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: "shoecart",
});
const parser = multer({ storage: storage });

function authenticateAdmin(req, res, next) {
  let token = req.cookies.adminJwt;
  if (!token) {
    return res.redirect("/admin");
  }

  jwt.verify(token, JWT_SECRET, (err, admin) => {
    if (err) {
      return res.redirect("/admin");
    }
    req.admin = admin;
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
      res.render("admin-login");
    }
  } else {
    res.render("admin-login");
  }
});

router.get("/dashboard", authenticateAdmin, (req, res) => {
  res.render("admin-dashboard");
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
    res.render("admin-login", { notFound: "Incorrect username or password" });
  }
});

router.get("/view-products", async (req, res) => {
  const products = await Product.find().populate("category").populate("brand");
  res.render("admin-view-products", { products });
});

router.get("/edit-product/:productId", async (req, res) => {
  const productId = req.params.productId;
  const product = await Product.findOne({ _id: productId });
  const category = await Category.find();
  const brands = await Brand.find();
  if (product) {
    res.render("admin-edit-product", { product, category, brands });
  } else {
    res.send("Invalid product");
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
        estProfit: req.body.estProfit,
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
      updatedProductData.images = allImageUrls;

      await Product.findByIdAndUpdate(productId, updatedProductData);

      res.redirect("/admin/view-products");
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
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
  res.render("admin-view-products", { products });
});

router.get("/add-product", async (req, res) => {
  const category = await Category.find();
  const brands = await Brand.find();
  res.render("admin-add-product", { category, brands });
});

router.post(
  "/add-product",
  parser.fields([
    { name: "image", maxCount: 3 },
    { name: "mainImage", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      let imageUrls = req.files.image
        ? req.files.image.map((file) => file.path)
        : [];
      const product = new Product({
        name: req.body.product_name,
        color: req.body.product_color,
        size: req.body.product_size,
        category: new mongoose.Types.ObjectId(req.body.product_category),
        brand: new mongoose.Types.ObjectId(req.body.product_brand),
        description: req.body.description,
        stock: req.body.stock,
        price: req.body.price,
        estProfit: req.body.estProfit,
        mainImage:
          req.files.mainImage && req.files.mainImage[0]
            ? req.files.mainImage[0].path
            : undefined,
        images: imageUrls,
      });

      const result = await product.save();
      console.log("result :", result);
      res.redirect("/admin/view-products");
    } catch (err) {
      console.log("Error while adding product:", err);
      res.end("error", err);
    }
  }
);

router.get("/edit-brand/:brandId", async (req, res) => {
  const brandId = req.params.brandId;
  const brand = await Brand.findOne({ _id: brandId });
  if (brand) {
    res.render("admin-edit-brand", { brand });
  } else {
    res.send("invalid brand");
  }
});

router.get("/edit-category/:categoryId", async (req, res) => {
  const category = await Category.findById(req.params.categoryId);
  if (category) {
    res.render("admin-edit-category", { category });
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
  const brands = await Brand.find();
  res.render("admin-view-brands", { brands });
});

router.get("/view-category", async (req, res) => {
  const category = await Category.find();
  res.render("admin-view-category", { category });
});

router.get("/add-category", (req, res) => {
  res.render("admin-add-category");
});

router.get("/add-brands", (req, res) => {
  res.render("admin-add-brands");
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
    await Category.findByIdAndDelete(req.params.categoryId);
    res.redirect("/admin/view-category");
  } catch (err) {
    console.error("Error while deleting category:", err);
    res.status(500).send("Error occurred while deleting the category.");
  }
});

router.get("/delete-brand/:brandsId", async (req, res) => {
  try {
    await Brand.findByIdAndDelete(req.params.brandsId);
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
  res.render("admin-view-category", { category });
});

router.get("/search-brands", async (req, res) => {
  const searchTerm = req.query.q;
  const brands = await Brand.find({
    name: new RegExp(searchTerm, "i"),
  });
  res.render("admin-view-brands", { brands });
});

router.get("/search-users", async (req, res) => {
  const searchTerm = req.query.q;
  const users = await User.find({
    name: new RegExp(searchTerm, "i"),
    verified: true,
  });
  res.render("admin-view-users", { users });
});

router.get("/view-users", async (req, res) => {
  const users = await User.find({ verified: true });
  res.render("admin-view-users", { users });
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

module.exports = router;
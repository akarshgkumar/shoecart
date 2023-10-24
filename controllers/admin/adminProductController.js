const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Product = require("../../models/Product");
const parser = require("../../config/cloudinaryConfig");
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);

router.get("/view-products", async (req, res) => {
  const options = {
    sort: { totalSoldItems: -1 },
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
      brand: { $exists: true, $ne: null },
      category: { $exists: true, $ne: null },
    };
    const result = await Product.paginate(filter, options);
    const categories = req.categories;

    res.render("admin/admin-view-products", {
      categories,
      products: result.products,
      productCount: result.productCount,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    req.flash("error", "Error fetching products");
    res.redirect("back");
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

      console.log(req.body.product_sizes);
      let sizes = req.body.product_sizes || [];
      console.log("Sizes before :", sizes);
      if (!Array.isArray(sizes)) {
        sizes = [sizes];
      }
      console.log("Sizes after :", sizes);
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

router.get("/hide-product/:productId", async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);

    if (!product) {
      req.flash("error", "Product not found.");
      return res.redirect("/admin/view-products");
    }

    await Product.findByIdAndUpdate(req.params.productId, { isDeleted: true });
    await Category.updateOne(
      { _id: product.category },
      { $inc: { productCount: -1 } }
    );
    await Brand.updateOne(
      { _id: product.brand },
      { $inc: { productCount: -1 } }
    );

    const referrer = req.header("Referer");
    if (referrer) {
      return res.redirect("back");
    } else {
      return res.redirect("/admin/view-products");
    }
  } catch (err) {
    console.error("Error:", err);
    req.flash("error", "Internal Server Error");
    return res.redirect("/admin/view-products");
  }
});

router.get("/show-product/:productId", async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);

    if (!product) {
      req.flash("error", "Product not found.");
      return res.redirect("/admin/view-products");
    }

    await Product.findByIdAndUpdate(req.params.productId, { isDeleted: false });
    await Category.updateOne(
      { _id: product.category },
      { $inc: { productCount: 1 } }
    );
    await Brand.updateOne(
      { _id: product.brand },
      { $inc: { productCount: 1 } }
    );

    const referrer = req.header("Referer");
    if (referrer) {
      return res.redirect("back");
    } else {
      return res.redirect("/admin/view-products");
    }
  } catch (err) {
    console.error("Error:", err);
    req.flash("error", "Internal Server Error");
    return res.redirect("/admin/view-products");
  }
});

router.get("/search-product", async (req, res) => {
  try {
    const options = {
      sort: { totalSoldItems: -1 },
      page: parseInt(req.query.page) || 1,
      limit: 8,
      populate: ["category", "brand"],
      customLabels: {
        docs: "products",
        totalDocs: "productCount",
      },
    };

    const searchTerm = req.query.q;
    const filter = {
      name: new RegExp(searchTerm, "i"),
    };

    const result = await Product.paginate(filter, options);

    if (result.products.length === 0) {
      req.flash("error", "No products found for the given search term.");
      if (req.headers.referer) {
        return res.redirect("back");
      } else {
        return res.redirect("/admin/view-products");
      }
    }

    res.render("admin/admin-view-products", {
      categories: req.categories,
      products: result.products,
      productCount: result.productCount,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (err) {
    console.log("Error while searching for products:", err);
    req.flash("error", "Internal server error. Failed to search products.");
    res.redirect("/admin/view-products");
  }
});

router.get("/add-product", async (req, res) => {
  const category = await Category.find();
  const brands = await Brand.find();
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
      console.log(req.body.product_sizes);
      let sizes = req.body.product_sizes || [];
      console.log("Sizes before :", sizes);
      if (!Array.isArray(sizes)) {
        sizes = [sizes];
      }
      console.log("Sizes after :", sizes);
      const numericSizes = sizes.map(Number);
      const categoryId = req.body.product_category;
      const brandId = req.body.product_brand;
      const product = new Product({
        shortId: uniqueShortId,
        name: req.body.product_name,
        color: req.body.product_color,
        sizes: numericSizes,
        category: new mongoose.Types.ObjectId(categoryId),
        brand: new mongoose.Types.ObjectId(brandId),
        description: req.body.description,
        stock: req.body.stock,
        price: req.body.price,
        mainImage:
          req.files.mainImage && req.files.mainImage[0]
            ? req.files.mainImage[0].path
            : undefined,
        images: imageUrls,
      });
      await Category.updateOne(
        { _id: categoryId },
        { $inc: { productCount: 1 } }
      );
      await Brand.updateOne({ _id: brandId }, { $inc: { productCount: 1 } });
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

router.get("/edit-product/:productId", async (req, res) => {
  const productId = req.params.productId;
  const product = await Product.findOne({ _id: productId });
  const category = await Category.find();
  const brands = await Brand.find();
  if (product) {
    res.render("admin/admin-edit-product", { product, category, brands });
  } else {
    req.flash("error", "Invalid product");
    res.redirect("/admin/view-products");
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

router.get("/filter-products/category/:categoryId", async (req, res) => {
  const categoryId = req.params.categoryId;

  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 9,
    populate: ["category", "brand"],
    customLabels: {
      docs: "products",
      totalDocs: "productCount",
    },
  };

  try {
    const filter = {
      category: categoryId,
    };
    const result = await Product.paginate(filter, options);

    if (!result.productCount) {
      req.flash("error", "No products on this category");
      return res.redirect("back");
    }

    const categories = req.categories;

    res.render("admin/admin-view-products", {
      selectedCategoryId: categoryId,
      products: result.products,
      productCount: result.productCount,
      current: result.page,
      pages: result.totalPages,
      categories,
    });
  } catch (err) {
    console.error("Error fetching products by category:", err);
    req.flash("error", "Error fetching products");
    res.redirect("back");
  }
});

router.get("/filter-products/status/:status", async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 8,
    populate: ["category", "brand"],
    customLabels: {
      docs: "products",
      totalDocs: "productCount",
    },
  };
  const status = req.params.status;
  const isDeletedStatus = status === "true";
  console.log(isDeletedStatus);
  try {
    const filter = {
      brand: { $exists: true, $ne: null },
      category: { $exists: true, $ne: null },
      isDeleted: isDeletedStatus,
    };
    const result = await Product.paginate(filter, options);
    const categories = req.categories;

    res.render("admin/admin-view-products", {
      categories,
      products: result.products,
      productCount: result.productCount,
      current: result.page,
      pages: result.totalPages,
      selectedProductFilter: status,
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    req.flash("error", "Error fetching products");
    res.redirect("back");
  }
});

const express = require("express");
const router = express.Router();
const Product = require("../../models/Product");
const Brand = require("../../models/Brand");

router.get("/view-full-products", async (req, res) => {
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
      isDeleted: false,
      brand: { $exists: true, $ne: null },
      category: { $exists: true, $ne: null },
    };
    const result = await Product.paginate(filter, options);
    const categories = req.categories;
    const brands = await Brand.find();
    const latestProducts = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(3)
      .populate(["category", "brand"]);

    res.render("user/user-view-full-products", {
      products: result.products,
      productCount: result.productCount,
      current: result.page,
      pages: result.totalPages,
      categories,
      latestProducts,
      brands,
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    req.flash("error", "Error fetching products");
    res.redirect("/home");
  }
});

router.get("/view-single-product/:productId", async (req, res) => {
  const productId = req.params.productId;
  const product = await Product.findOne({ _id: productId })
    .populate("category")
    .populate("brand");
  console.log(product);
  res.render("user/user-single-product", {
    product,
    categories: req.categories,
  });
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

    if(!result.productCount){
      req.flash("error", "No products on this category");
      return res.redirect("back");
    }

    const categories = req.categories;
    const brands = await Brand.find();
    const latestProducts = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(3)
      .populate(["category", "brand"]);

    res.render("user/user-view-full-products", {
      selectedCategoryId: categoryId,
      products: result.products,
      productCount: result.productCount,
      current: result.page,
      pages: result.totalPages,
      categories,
      latestProducts,
      brands,
    });
  } catch (err) {
    console.error("Error fetching products by category:", err);
    req.flash("error", "Error fetching products");
    res.redirect("/home");
  }
});

router.get("/filter-products/brand/:brandId", async (req, res) => {
  const brandId = req.params.brandId;

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
      brand: brandId,
    };
    const result = await Product.paginate(filter, options);

    if(!result.productCount){
      req.flash("error", "No products on this brand");
      return res.redirect("back");
    }

    const categories = req.categories;
    const brands = await Brand.find();
    const latestProducts = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(3)
      .populate(["category", "brand"]);

    res.render("user/user-view-full-products", {
      products: result.products,
      productCount: result.productCount,
      current: result.page,
      pages: result.totalPages,
      categories,
      latestProducts,
      brands,
    });
  } catch (err) {
    console.error("Error fetching products by brand:", err);
    req.flash("error", "Error fetching products");
    res.redirect("/home");
  }
});

router.get("/search-products", async (req, res) => {
  const searchTerm = req.query.q;
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 10,
    populate: ["category", "brand"],
    customLabels: {
      docs: "products",
      totalDocs: "productCount",
    },
  };

  try {
    const filter = {
      isDeleted: false,
      name: new RegExp(searchTerm, "i"),
      brand: { $exists: true, $ne: null },
      category: { $exists: true, $ne: null },
    };
    const result = await Product.paginate(filter, options);

    if (result.productCount === 0) {
      req.flash("error", "No products found for the provided search term.");
      return res.redirect("back");
    }

    const categories = req.categories;
    const latestProducts = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(3)
      .populate(["category", "brand"]);

    res.render("user/user-view-full-products", {
      products: result.products,
      productCount: result.productCount,
      current: result.page,
      pages: result.totalPages,
      categories: categories,
      latestProducts: latestProducts,
    });
  } catch (err) {
    console.error("Error searching products:", err);
    req.flash("error", "Error searching products");
    res.redirect("/home");
  }
});

module.exports = router;

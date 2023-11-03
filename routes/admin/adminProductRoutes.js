const express = require("express");
const router = express.Router();
const parser = require("../../config/cloudinaryConfig");
const productController = require("../../controllers/admin/adminProductController");

// Route to view all products
router.get("/view-products", productController.viewProducts);

// Routes for adding a new product
router.get("/add-product", productController.getAddProduct);
router.post(
  "/add-product",
  parser.fields([
    { name: "image", maxCount: 3 },
    { name: "mainImage", maxCount: 1 }
  ]),
  productController.postAddProduct
);

// Routes for editing an existing product
router.get("/edit-product/:productId", productController.getEditProduct);
router.post(
  "/edit-product/:productId",
  parser.fields([
    { name: "image", maxCount: 3 },
    { name: "mainImage", maxCount: 1 }
  ]),
  productController.postEditProduct
);

// Routes for hiding and showing products
router.get("/hide-product/:productId", productController.hideProduct);
router.get("/show-product/:productId", productController.showProduct);

// Route to add stock to a product
router.get("/add-stock/:productId", productController.getAddStock);
router.post("/add-stock/:productId", productController.postAddStock);

// Routes for filtering products
router.get("/filter-products/category/:categoryId", productController.getFilterProductsByCategory);
router.get("/filter-products/status/:status", productController.getFilterProductsByStatus);

// Route for searching products
router.get("/search-product", productController.searchProducts);

module.exports = router;

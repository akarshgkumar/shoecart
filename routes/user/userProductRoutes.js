const express = require("express");
const router = express.Router();
const productController = require("../../controllers/user/userProductController");

// Route to view all products
router.get("/view-full-products", productController.viewFullProducts);

// Route to view a single product by ID
router.get("/view-single-product/:productId", productController.viewSingleProduct);

// Route to filter products by category
router.get("/filter-products/category/:categoryId", productController.filterProductsByCategory);

// Route to filter products by brand
router.get("/filter-products/brand/:brandId", productController.filterProductsByBrand);

// Route for searching products
router.get("/search-products", productController.searchProducts);

module.exports = router;

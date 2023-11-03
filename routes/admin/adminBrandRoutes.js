const express = require("express");
const router = express.Router();
const adminBrandController = require("../../controllers/admin/adminBrandController");

// Route to view all brands
router.get("/view-brands", adminBrandController.viewBrands);

// Routes for adding brands
router.get("/add-brands", adminBrandController.addBrandsGet);
router.post("/add-brands", adminBrandController.addBrandsPost);

// Routes for editing a specific brand
router.get("/edit-brand/:brandId", adminBrandController.editBrandGet);
router.post("/edit-brand/:brandId", adminBrandController.editBrandPost);

// Route to check if a brand name exists
router.get("/check-brand/:name", adminBrandController.checkBrand);

// Route to search for brands
router.get("/search-brands", adminBrandController.searchBrands);

module.exports = router;

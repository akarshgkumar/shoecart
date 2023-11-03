const express = require("express");
const router = express.Router();
const parser = require("../../config/cloudinaryConfig");
const adminCategoryController = require("../../controllers/admin/adminCategoryController");

// Route to view all categories
router.get("/view-category", adminCategoryController.viewCategories);

// Routes for adding a new category
router.get("/add-category", adminCategoryController.addCategoryGet);
router.post("/add-category", parser.single("category_img"), adminCategoryController.addCategoryPost);

// Routes for editing an existing category
router.get("/edit-category/:categoryId", adminCategoryController.editCategoryGet);
router.post("/edit-category/:categoryId", adminCategoryController.editCategoryPost);

// Routes for editing an existing category's image
router.get("/edit-category-image/:categoryId", adminCategoryController.editCategoryImageGet);
router.post("/edit-category-image/:categoryId", parser.single("category_img"), adminCategoryController.editCategoryImagePost);

// Route to check if a category name exists
router.get("/check-category", adminCategoryController.checkCategory);

// Route to search for categories
router.get("/search-category", adminCategoryController.searchCategory);

module.exports = router;

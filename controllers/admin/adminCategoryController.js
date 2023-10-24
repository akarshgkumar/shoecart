const express = require("express");
const router = express.Router();
const Category = require("../../models/Category");
const capitalizeWords = require("../../middlewares/admin/capitalizeWords");
const parser = require("../../config/cloudinaryConfig");

router.get("/view-category", async (req, res) => {
  const options = {
    sort: { productCount: -1 },
    page: parseInt(req.query.page) || 1,
    limit: 10,
  };

  try {
    const result = await Category.paginate({}, options);
    res.render("admin/admin-view-category", {
      category: result.docs,
      categoryCount: result.totalDocs,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.redirect("back");
  }
});

router.get("/add-category", (req, res) => {
  res.render("admin/admin-add-category");
});

router.post(
  "/add-category",
  parser.single("category_img"),
  async (req, res) => {
    try {
      const name = req.body.category_name;

      let imageUrl = "";
      console.log("before :", imageUrl);
      console.log(req.file);
      if (req.file) {
        imageUrl = req.file.path;
      }
      console.log("after :", imageUrl);

      const newCategory = new Category({ name, imageUrl });
      console.log("after updating :", imageUrl);

      await newCategory.save();

      req.flash("success", "Category added successfully");
      res.redirect("/admin/view-category");
    } catch (err) {
      console.error(err);
      req.flash("error", "Internal server error");
      res.redirect("/admin/add-category");
    }
  }
);

router.get("/edit-category/:categoryId", async (req, res) => {
  const category = await Category.findById(req.params.categoryId);
  if (category) {
    res.render("admin/admin-edit-category", { category });
  } else {
    req.flash("error", "Invalid category");
    res.redirect("back");
  }
});

router.get("/edit-category-image/:categoryId", async (req, res) => {
  const category = await Category.findById(req.params.categoryId);
  if (category) {
    res.render("admin/admin-category-image-edit", { category });
  } else {
    req.flash("error", "Invalid category");
    res.redirect("back");
  }
});

router.post("/edit-category/:categoryId", async (req, res) => {
  const categoryId = req.params.categoryId;
  try {
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).send("category not found");
    }
    console.log(req.body.category_name);
    const updatedcategoryData = {
      name: capitalizeWords(req.body.category_name),
    };

    await Category.findByIdAndUpdate(categoryId, updatedcategoryData);

    res.redirect("/admin/view-category");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

router.post(
  "/edit-category-image/:categoryId",
  parser.single("category_img"),
  async (req, res) => {
    const categoryId = req.params.categoryId;

    try {
      const category = await Category.findById(categoryId);

      if (!category) {
        return res.status(404).send("Category not found");
      }

      let imageUrl = category.imageUrl;
      console.log("before :", imageUrl);
      console.log(req.file);

      if (req.file) {
        imageUrl = req.file.path;
      }
      console.log("after :", imageUrl);

      const updatedCategoryData = {
        imageUrl: imageUrl,
      };
      console.log("after updating :", imageUrl);

      await Category.findByIdAndUpdate(categoryId, updatedCategoryData);

      res.redirect("/admin/view-category");
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
);

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

router.get("/search-category", async (req, res) => {
  try {
    const options = {
      sort: { productCount: -1 },
      page: parseInt(req.query.page) || 1,
      limit: 10,
    };

    const searchTerm = req.query.q;
    const filter = {
      name: new RegExp(searchTerm, "i"),
    };

    const result = await Category.paginate(filter, options);

    if (result.docs.length === 0) {
      req.flash("error", "No categories found for the given search term.");
      if (req.headers.referer) {
        return res.redirect("back");
      } else {
        return res.redirect("/admin/view-category");
      }
    }

    res.render("admin/admin-view-category", {
      category: result.docs,
      categoryCount: result.totalDocs,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (err) {
    console.log("Error while searching for categories:", err);
    req.flash("error", "Internal server error. Failed to search categories.");
    res.redirect("/admin/view-category");
  }
});

module.exports = router;
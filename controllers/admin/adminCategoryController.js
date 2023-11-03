const Category = require("../../models/Category");
const Product = require("../../models/Product");
const capitalizeWords = require("../../middlewares/admin/capitalizeWords");

exports.viewCategories = async (req, res) => {
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
};

exports.addCategoryGet = (req, res) => {
  res.render("admin/admin-add-category");
};

exports.addCategoryPost = async (req, res) => {
  try {
    const name = req.body.category_name;
    const discountPercentage = req.body.discount_percentage || 0;
    let imageUrl = "";
    if (req.file) {
      imageUrl = req.file.path;
    }
    const newCategory = new Category({ name, imageUrl, discountPercentage });
    await newCategory.save();
    req.flash("success", "Category added successfully");
    res.redirect("/admin/category/view-category");
  } catch (err) {
    console.error(err);
    req.flash("error", "Internal server error");
    res.redirect("/admin/category/add-category");
  }
};

exports.editCategoryGet = async (req, res) => {
  const category = await Category.findById(req.params.categoryId);
  if (category) {
    res.render("admin/admin-edit-category", { category });
  } else {
    req.flash("error", "Invalid category");
    res.redirect("back");
  }
};

exports.editCategoryPost = async (req, res) => {
  const categoryId = req.params.categoryId;
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).send("Category not found");
    }
    const updatedcategoryData = {
      name: capitalizeWords(req.body.category_name),
      discountPercentage: req.body.discount_percentage || 0,
    };

    await Category.findByIdAndUpdate(categoryId, updatedcategoryData);

    // Update related products
    const categoryDiscount = updatedcategoryData.discountPercentage;
    const allProducts = await Product.find({ category: categoryId });

    for (const product of allProducts) {
      product.categoryDiscountPercentage = categoryDiscount;
      product.discountPercentage = Math.max(product.categoryDiscountPercentage, product.individualDiscountPercentage);
      const originalPrice = product.price;
      const discountAmount = (originalPrice * product.discountPercentage) / 100;
      product.priceAfterDiscount = Math.round(originalPrice - discountAmount);
      await product.save();
    }

    req.flash("success", "Category updated successfully");
    res.redirect("/admin/category/view-category");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.editCategoryImageGet = async (req, res) => {
  const category = await Category.findById(req.params.categoryId);
  if (category) {
    res.render("admin/admin-category-image-edit", { category });
  } else {
    req.flash("error", "Invalid category");
    res.redirect("back");
  }
};

exports.editCategoryImagePost = async (req, res) => {
  const categoryId = req.params.categoryId;
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).send("Category not found");
    }
    let imageUrl = category.imageUrl;
    if (req.file) {
      imageUrl = req.file.path;
    }
    await Category.findByIdAndUpdate(categoryId, { imageUrl: imageUrl });
    res.redirect("/admin/category/view-category");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.checkCategory = async (req, res) => {
  try {
    const { categoryName, editCategoryName } = req.query;
    let category;
    if (categoryName === editCategoryName) {
      category = null;
    } else {
      category = await Category.findOne({
        name: { $regex: `^${categoryName}$`, $options: "i" },
      });
    }
    res.json({ exists: !!category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.searchCategory = async (req, res) => {
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
      return res.redirect(req.headers.referer || "/admin/view-category");
    }
    res.render("admin/admin-view-category", {
      category: result.docs,
      categoryCount: result.totalDocs,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (err) {
    console.error("An error occurred:", err);
    req.flash("error", "Internal server error. Failed to search categories.");
    res.redirect("/admin/category/view-category");
  }
};

const mongoose = require("mongoose");
const Product = require("../../models/Product");
const Category = require("../../models/Category");
const Brand = require("../../models/Brand");
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);
exports.viewProducts = async (req, res) => {
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
};

exports.postEditProduct = async (req, res) => {
  const productId = req.params.productId;
  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    let sizes = req.body.product_sizes || [];
    if (!Array.isArray(sizes)) {
      sizes = [sizes];
    }

    const numericSizes = sizes.map(Number);
    const categoryId = req.body.product_category;
    const category = await Category.findById(categoryId);
    const categoryDiscount = category.discountPercentage || 0;
    const individualDiscountPercentage =
      parseFloat(req.body.discount_percentage) || 0;
    const highestDiscountPercentage = Math.max(
      individualDiscountPercentage,
      categoryDiscount
    );

    const originalPrice = parseFloat(req.body.price);
    const discountAmount = (originalPrice * highestDiscountPercentage) / 100;
    const priceAfterDiscount = Math.round(originalPrice - discountAmount);

    const brandId = req.body.product_brand;

    const updatedProductData = {
      name: req.body.product_name,
      color: req.body.product_color,
      sizes: numericSizes,
      category: new mongoose.Types.ObjectId(categoryId),
      brand: new mongoose.Types.ObjectId(brandId),
      description: req.body.description,
      price: originalPrice,
      priceAfterDiscount: priceAfterDiscount,
      stock: req.body.stock,
      mainImage:
        req.files.mainImage && req.files.mainImage[0]
          ? req.files.mainImage[0].path
          : product.mainImage,
      discountPercentage: highestDiscountPercentage,
      individualDiscountPercentage: individualDiscountPercentage,
      categoryDiscountPercentage: categoryDiscount,
    };

    const oldCategoryId = product.category;
    const oldBrandId = product.brand;
    console.log(product.isCascadedDelete);
    let isCascadedDelete = product.isCascadedDelete;

    if (oldCategoryId.toString() !== categoryId.toString()) {
      await Category.updateOne(
        { _id: categoryId },
        { $inc: { productCount: 1 } }
      );
      await Category.updateOne(
        { _id: product.category },
        { $inc: { productCount: -1 } }
      );
      const newCategory = await Category.findById(categoryId);
      if (newCategory.isDeleted) {
        isCascadedDelete = true;
      } else {
        isCascadedDelete = false;
      }
    }

    if (oldBrandId.toString() !== brandId.toString()) {
      await Brand.updateOne({ _id: brandId }, { $inc: { productCount: 1 } });
      await Brand.updateOne(
        { _id: product.brand },
        { $inc: { productCount: -1 } }
      );
      const newBrand = await Brand.findById(brandId);
      if (newBrand.isDeleted) {
        isCascadedDelete = true;
      } else {
        isCascadedDelete = false;
      }
    }

    updatedProductData.isCascadedDelete = isCascadedDelete;

    if (isCascadedDelete === true) {
      updatedProductData.isDeleted = true;
    } else {
      updatedProductData.isDeleted = false;
    }

    const newImageUrls = req.files.image
      ? req.files.image.map((file) => file.path)
      : [];
    product.images.forEach((imagePath, index) => {});
    const retainedImages = product.images.filter(
      (imagePath, index) => req.body[`deleteImage${index}`] === "on"
    );
    const allImageUrls = [...retainedImages, ...newImageUrls];
    if (allImageUrls.length > 3) {
      req.flash("error", "Only submit 3 sub images");
      return res.redirect(`/admin/product/edit-product/${productId}`);
    }

    updatedProductData.images = allImageUrls;
    await Product.findByIdAndUpdate(productId, updatedProductData);
    req.flash("success", "Product edited successfully");
    res.redirect("/admin/product/view-products");
  } catch (err) {
    console.error(err);
    req.flash("error", "Internal server error");
    res.redirect(`/admin/product/edit-product/${productId}`);
  }
};

exports.hideProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await Product.findById(productId);

    if (!product) {
      req.flash("error", "Product not found.");
      return res.redirect("/admin/product/view-products");
    }

    await Product.findByIdAndUpdate(productId, {
      isDeleted: true,
      isSelfDeleted: true,
    });

    const referrer = req.header("Referer");
    if (referrer) {
      return res.redirect("back");
    } else {
      return res.redirect("/admin/product/view-products");
    }
  } catch (err) {
    console.error("Error:", err);
    req.flash("error", "Internal Server Error");
    return res.redirect("/admin/product/view-products");
  }
};

exports.showProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await Product.findById(productId);

    if (!product) {
      req.flash("error", "Product not found.");
      return res.redirect("/admin/product/view-products");
    }
    const updateResult = await Product.updateOne(
      { _id: productId, isCascadedDelete: false },
      { $set: { isDeleted: false, isSelfDeleted: false } }
    );

    if (updateResult.modifiedCount === 0) {
      req.flash("error", "Product's category or brand is deleted");
    }

    const referrer = req.header("Referer");
    if (referrer) {
      return res.redirect("back");
    } else {
      return res.redirect("/admin/product/view-products");
    }
  } catch (err) {
    console.error("Error:", err);
    req.flash("error", "Internal Server Error");
    return res.redirect("/admin/product/view-products");
  }
};

exports.searchProducts = async (req, res) => {
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
        return res.redirect("/admin/product/view-products");
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
    req.flash("error", "Internal server error. Failed to search products.");
    res.redirect("/admin/product/view-products");
  }
};

exports.getAddProduct = async (req, res) => {
  const category = await Category.find();
  const brands = await Brand.find();
  res.render("admin/admin-add-product", { category, brands });
};

exports.postAddProduct = async (req, res) => {
  try {
    let uniqueShortId;
    let existingProduct;
    let retryLimit = 10;
    let retryCount = 0;

    do {
      uniqueShortId = nanoid();
      existingProduct = await Product.findOne({ shortId: uniqueShortId });
      retryCount++;
    } while (existingProduct && retryCount < retryLimit);

    if (retryCount === retryLimit) {
      req.flash(
        "error",
        "Failed to generate a unique product ID. Please try again later."
      );
      return res.redirect("/admin/product/add-product");
    }

    let imageUrls = req.files.image
      ? req.files.image.map((file) => file.path)
      : [];
    let sizes = req.body.product_sizes || [];
    if (!Array.isArray(sizes)) {
      sizes = [sizes];
    }
    const numericSizes = sizes.map(Number);
    const categoryId = req.body.product_category;
    const category = await Category.findById(categoryId);
    const productDiscountPercentage =
      parseFloat(req.body.discount_percentage) || 0;
    const categoryDiscount = category.discountPercentage || 0;
    const highestDiscountPercentage = Math.max(
      productDiscountPercentage,
      categoryDiscount
    );

    const originalPrice = parseFloat(req.body.price);
    const discountAmount = (originalPrice * highestDiscountPercentage) / 100;
    const priceAfterDiscount = Math.round(originalPrice - discountAmount);

    const brand = await Brand.findById(req.body.product_brand);
    const isCategoryDeleted = category && category.isDeleted;
    const isBrandDeleted = brand && brand.isDeleted;

    const isProductDeleted = isCategoryDeleted || isBrandDeleted;
    const isCascadedDelete = isProductDeleted;

    const product = new Product({
      shortId: uniqueShortId,
      name: req.body.product_name,
      color: req.body.product_color,
      sizes: numericSizes,
      category: new mongoose.Types.ObjectId(categoryId),
      brand: new mongoose.Types.ObjectId(req.body.product_brand),
      description: req.body.description,
      stock: req.body.stock,
      price: req.body.price,
      priceAfterDiscount: priceAfterDiscount,
      mainImage:
        req.files.mainImage && req.files.mainImage[0]
          ? req.files.mainImage[0].path
          : undefined,
      images: imageUrls,
      discountPercentage: highestDiscountPercentage,
      individualDiscountPercentage: productDiscountPercentage,
      categoryDiscountPercentage: categoryDiscount,
      isDeleted: isProductDeleted,
      isCascadedDelete: isCascadedDelete,
    });

    await Category.updateOne(
      { _id: categoryId },
      { $inc: { productCount: 1 } }
    );
    await Brand.updateOne(
      { _id: req.body.product_brand },
      { $inc: { productCount: 1 } }
    );


    await product.save();
    req.flash("success", "Product added successfully");
    res.redirect("/admin/product/view-products");
  } catch (err) {
    req.flash("error", "Internal server error. Failed to add the product.");
    res.redirect("/admin/product/add-product");
  }
};

exports.getEditProduct = async (req, res) => {
  const productId = req.params.productId;
  const product = await Product.findOne({ _id: productId });
  const category = await Category.find();
  const brands = await Brand.find();
  if (product) {
    res.render("admin/admin-edit-product", { product, category, brands });
  } else {
    req.flash("error", "Invalid product");
    res.redirect("/admin/product/view-products");
  }
};

exports.getAddStock = async (req, res) => {
  const productId = req.params.productId;
  const product = await Product.findOne({ _id: productId }, "stock");
  res.render("admin/admin-add-stock", { productId, stock: product.stock });
};

exports.postAddStock = async (req, res) => {
  try {
    const { stock_no } = req.body;
    const productId = req.params.productId;

    await Product.findByIdAndUpdate(productId, {
      $inc: { stock: stock_no },
    });

    res.redirect("/admin/product/view-products");
  } catch (err) {
    console.error("Error while updating stock:", err);
    res.status(500).send("Server error");
  }
};

exports.getFilterProductsByCategory = async (req, res) => {
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
};

exports.getFilterProductsByStatus = async (req, res) => {
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
};

const express = require("express");
const router = express.Router();
const Product = require("../../models/Product");
const Brand = require("../../models/Brand");
const ObjectId = require("mongoose").Types.ObjectId;

const aggregateFeaturedQuery = [
  {
    $addFields: {
      featuredScore: {
        $sum: [
          "$totalSoldItems",
          "$discountPercentage",
          {
            $divide: [
              1000,
              {
                $cond: [
                  { $eq: ["$priceAfterDiscount", 0] },
                  1,
                  "$priceAfterDiscount",
                ],
              },
            ],
          },
        ],
      },
    },
  },
  { $sort: { featuredScore: -1 } },
];

router.get("/view-full-products", async (req, res) => {
  const sortBy = req.query.sortBy || "Featured";
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 9,
    populate: ["category", "brand"],
    customLabels: {
      docs: "products",
      totalDocs: "productCount",
    },
  };

  let sortQuery = {};

  switch (sortBy) {
    case "Best Sellers":
      sortQuery = { totalSoldItems: -1 };
      break;
    case "Price: Low to High":
      sortQuery = { priceAfterDiscount: 1 };
      break;
    case "Price: High to Low":
      sortQuery = { priceAfterDiscount: -1 };
      break;
    case "Top Discounts":
      sortQuery = { discountPercentage: -1 };
      break;
    case "Latest Arrivals":
      sortQuery = { createdAt: -1 };
      break;
    case "Featured":
      options.sort = undefined;
      options.customLabels = undefined;
      break;
    default:
      sortQuery = {};
      break;
  }

  options.sort = sortQuery;

  try {
    const filter = {
      isDeleted: false,
      brand: { $exists: true, $ne: null },
      category: { $exists: true, $ne: null },
    };

    let result;

    if (sortBy === "Featured") {
      const aggregatedProducts = await Product.aggregate(aggregateFeaturedQuery)
        .match(filter)
        .skip((options.page - 1) * options.limit)
        .limit(options.limit);
      const totalCount = await Product.countDocuments(filter);

      result = {
        products: aggregatedProducts,
        productCount: totalCount,
        page: options.page,
        totalPages: Math.ceil(totalCount / options.limit),
      };
    } else {
      result = await Product.paginate(filter, options);
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
      sortBy,
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
  res.render("user/user-single-product", {
    product,
    categories: req.categories,
  });
});

router.get("/filter-products/category/:categoryId", async (req, res) => {
  const categoryId = new ObjectId(req.params.categoryId);

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
    const sortBy = "Featured";
    const filter = {
      category: categoryId,
      isDeleted: false,
    };
    let result;
    const aggregatedProducts = await Product.aggregate(aggregateFeaturedQuery)
      .match(filter)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit);
    const totalCount = await Product.countDocuments(filter);
    result = {
      products: aggregatedProducts,
      productCount: totalCount,
      page: options.page,
      totalPages: Math.ceil(totalCount / options.limit),
    };

    if (!result.productCount) {
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
      sortBy: sortBy,
    });
  } catch (err) {
    console.error("Error fetching products by category:", err);
    req.flash("error", "Error fetching products");
    res.redirect("/home");
  }
});

router.get("/filter-products/brand/:brandId", async (req, res) => {
  const brandId = new ObjectId(req.params.brandId);
  const sortBy = 'Featured';

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
      brand: brandId,
    };
    const aggregatedProducts = await Product.aggregate(aggregateFeaturedQuery)
      .match(filter)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit);
    const totalCount = await Product.countDocuments(filter);
    result = {
      products: aggregatedProducts,
      productCount: totalCount,
      page: options.page,
      totalPages: Math.ceil(totalCount / options.limit),
    };

    if (!result.productCount) {
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
      sortBy
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
    const brands = await Brand.find();
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
      brands: brands,
    });
  } catch (err) {
    console.error("Error searching products:", err);
    req.flash("error", "Error searching products");
    res.redirect("/home");
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Category = require("../models/Category");

router.get("/view-full-products", async (req, res) => {
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
        const filter = { isDeleted: false, brand: { "$exists": true, "$ne": null }, category: { "$exists": true, "$ne": null } };
        const result = await Product.paginate(filter, options);
        const categories = await Category.find({});
        const latestProducts = await Product.find(filter)
            .sort({ createdAt: -1 })
            .limit(3)
            .populate(["category", "brand"]);

        res.render("user-view-full-products", {
            products: result.products,
            productCount: result.productCount,
            current: result.page,
            pages: result.totalPages,
            categories: categories,
            latestProducts: latestProducts
        });
    } catch (err) {
        console.error("Error fetching products:", err);
        res.status(500).send("Internal Server Error");
    }
});


router.get("/view-single-product/:productId", async (req, res) => {
    const productId = req.params.productId;
    const product = await Product.findOne({ _id: productId })
        .populate("category")
        .populate("brand");
        console.log(product)
    res.render("user-single-product", { product });
});

module.exports = router;

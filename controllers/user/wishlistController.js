const express = require("express");
const router = express.Router();
const Wishlist = require("../../models/Wishlist");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

router.post("/add-to-wishlist", async (req, res) => {
  try {
    const { productId } = req.body;

    if (!req.cookies.jwt) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId, products: [] });
    }

    const productIndex = wishlist.products.findIndex(
      (p) => p.productId.toString() === productId
    );

    if (productIndex !== -1) {
      return res.json({ success: false, alreadyExists: true });
    }

    wishlist.products.push({ productId });
    await wishlist.save();
    const totalWishlistItems = wishlist.products.length;

    res.json({ success: true, wishlistItems: totalWishlistItems });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.redirect("/login");
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const wishlist = await Wishlist.findOne({ userId }).populate({
      path: "products.productId",
      match: { isDeleted: false },
    });

    const validProducts =
      wishlist?.products.filter((product) => product.productId) || [];

    res.render("user/user-wishlist", { products: validProducts, userId });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    req.flash("error", "Error fetching wishlist");
    res.redirect("/home");
  }
});

router.post("/clear-wishlist", async (req, res) => {
  try {
    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    await Wishlist.findOneAndDelete({ userId });
    req.flash("success", "Wishlist cleared successfully");
    res.redirect("/wishlist");
  } catch (error) {
    console.error("Error clearing wishlist:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/remove-from-wishlist", async (req, res) => {
  try {
    const productId = req.body.productId;
    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    let wishlist = await Wishlist.findOne({ userId });
    wishlist.products = wishlist.products.filter(
      (p) => p.productId.toString() !== productId
    );

    await wishlist.save();
    const totalWishlistItems = wishlist.products.length;

    res.json({ success: true, wishlistItems: totalWishlistItems });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
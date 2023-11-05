const Wishlist = require("../../models/Wishlist");
const Product = require("../../models/Product");
const Cart = require("../../models/Cart");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

exports.addToWishlist = async (req, res) => {
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
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getWishlist = async (req, res) => {
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

    res.render("user/user-wishlist", {
      products: validProducts,
      userId,
      categories: req.categories,
    });
  } catch (error) {
    req.flash("error", "Error fetching wishlist");
    res.redirect("/home");
  }
};

exports.clearWishlist = async (req, res) => {
  try {
    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    await Wishlist.findOneAndDelete({ userId });
    req.flash("success", "Wishlist cleared successfully");
    res.redirect("/wishlist");
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.removeFromWishlist = async (req, res) => {
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
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.addToCartOnWishlist = async (req, res) => {
  try {
    const { productId, size, quantity } = req.body;

    if (!req.cookies.jwt) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    const product = await Product.findById(productId);
    if (!product || product.stock < quantity) {
      return res.json({
        success: false,
        message: "Not enough stock available",
      });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, products: [] });
    }

    const productIndex = cart.products.findIndex(
      (p) =>
        p.productId.toString() === productId &&
        p.size.toString() === size.toString()
    );

    if (productIndex > -1) {
      cart.products[productIndex].quantity =
        parseInt(cart.products[productIndex].quantity) + parseInt(quantity);
    } else {
      cart.products.push({
        productId,
        size,
        quantity,
      });
    }
    await cart.save();
    const totalItems = cart.products.reduce(
      (acc, product) => acc + product.quantity,
      0
    );
    let wishlist = await Wishlist.findOne({
      userId,
    });
    wishlist.products = wishlist.products.filter(
      (p) => p.productId.toString() !== productId
    );
    await wishlist.save();
    const totalWishlistItems = wishlist.products?.length;
    res.json({
      success: true,
      cartItems: totalItems,
      wishlistItems: totalWishlistItems,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

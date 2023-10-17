const express = require("express");
const router = express.Router();
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

router.post("/add-to-cart", async (req, res) => {
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
    res.json({ success: true, cartItems: totalItems });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/remove-from-cart", async (req, res) => {
  try {
    const productId = req.body.productId;

    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.json({ success: false, message: "No cart found" });
    }

    cart.products = cart.products.filter(
      (p) => p.productId.toString() !== productId
    );

    await cart.save();

    const totalItems = cart.products.reduce(
      (acc, product) => acc + product.quantity,
      0
    );

    res.json({ success: true, cartItems: totalItems });
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/clear-cart", async (req, res) => {
  try {
    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    await Cart.findOneAndRemove({ userId });
    req.flash("success", "Cart cleared");
  } catch (error) {
    console.error("Error clearing the cart:", error);
    req.flash("error", "Failed to clear cart. Please try again.");
  }
  res.redirect("/cart");
});

router.get("/", async (req, res) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.redirect("/login");
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const cart = await Cart.findOne({ userId }).populate({
      path: "products.productId",
      match: { isDeleted: false },
    });

    const validProducts =
      cart?.products.filter((product) => product.productId) || [];

    const populatedProducts = validProducts.map((product) => ({
      ...product.productId._doc,
      quantity: product.quantity,
      selectedSize: product.size,
    }));

    res.render("user/shop-cart", { products: populatedProducts, userId });
  } catch (error) {
    console.error("Error fetching cart:", error);
    req.flash("error", "Internal server error");
    res.redirect("/home");
  }
});

router.post("/update-cart-quantity", async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.json({ success: false, message: "No cart found" });
    }

    const productToUpdate = cart.products.find(
      (p) => p.productId.toString() === productId
    );
    if (productToUpdate) {
      productToUpdate.quantity = quantity;
      await cart.save();
      const totalItems = cart.products.reduce(
        (acc, product) => acc + product.quantity,
        0
      );
      res.json({ success: true, cartItems: totalItems });
    } else {
      res.json({ success: false, message: "Product not found in cart" });
    }
  } catch (error) {
    console.error("Error updating product quantity:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/update-product-size", async (req, res) => {
  try {
    const { productId, newSize } = req.body;
    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    const userId = decoded.userId;

    const cart = await Cart.findOne({ userId });
    const productIndex = cart.products.findIndex(
      (p) => p.productId.toString() === productId
    );

    if (productIndex > -1) {
      cart.products[productIndex].size =
        newSize || cart.products[productIndex].product.sizes[0];
      await cart.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating product size:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
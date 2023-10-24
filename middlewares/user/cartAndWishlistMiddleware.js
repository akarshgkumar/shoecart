const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const Cart = require("../../models/Cart");
const Wishlist = require("../../models/Wishlist");


async function fetchCartForUser(req, res, next) {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      res.locals.cartItems = 0;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const cart = await Cart.findOne({ userId }).populate({
      path: "products.productId",
      select: "isDeleted",
    });

    if (cart) {
      const validProducts = cart.products.filter(
        (product) => product.productId && !product.productId.isDeleted
      );

      const totalItems = validProducts.reduce(
        (acc, product) => acc + product.quantity,
        0
      );
      res.locals.cartItems = totalItems;
    } else {
      res.locals.cartItems = 0;
    }
    next();
  } catch (error) {
    console.error("Error fetching cart in middleware:", error);
    res.locals.cartItems = 0;
    next();
  }
}

async function fetchWishlistForUser(req, res, next) {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      res.locals.wishlistItems = 0;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const wishlist = await Wishlist.findOne({ userId }).populate({
      path: "products.productId",
      select: "isDeleted",
    });

    if (wishlist) {
      const validProducts = wishlist.products?.filter(
        (product) => product.productId && !product.productId.isDeleted
      );

      const totalWishlistItems = validProducts.length;
      res.locals.wishlistItems = totalWishlistItems;
    } else {
      res.locals.wishlistItems = 0;
    }
    next();
  } catch (error) {
    console.error("Error fetching wishlist in middleware:", error);
    res.locals.wishlistItems = 0;
    next();
  }
}
module.exports = {
  fetchCartForUser,
  fetchWishlistForUser,
};

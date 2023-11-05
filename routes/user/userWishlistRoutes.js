const express = require("express");
const router = express.Router();
const wishlistController = require("../../controllers/user/userWishlistController");

// Route to add an item to the wishlist
router.post("/add-to-wishlist", wishlistController.addToWishlist);

// Route to retrieve the wishlist
router.get("/", wishlistController.getWishlist);

// Route to clear the wishlist
router.post("/clear-wishlist", wishlistController.clearWishlist);

// Route to remove an item from the wishlist
router.post("/remove-from-wishlist", wishlistController.removeFromWishlist);

// Route to add an item to cart from the wishlist
router.post("/add-to-cart", wishlistController.addToCartOnWishlist);

module.exports = router;

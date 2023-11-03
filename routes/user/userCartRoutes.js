const express = require("express");
const router = express.Router();
const cartController = require("../../controllers/user/userCartController");

// Route to handle adding items to the cart
router.post("/add-to-cart", cartController.addToCart);

// Route to handle removing items from the cart
router.post("/remove-from-cart", cartController.removeFromCart);

// Route to handle clearing the cart
router.post("/clear-cart", cartController.clearCart);

// Route to retrieve the contents of the cart
router.get("/", cartController.getCart);

// Route to update the quantity of a cart item
router.post("/update-cart-quantity", cartController.updateCartQuantity);

// Route to update the size of a product in the cart
router.post("/update-product-size", cartController.updateProductSize);

module.exports = router;

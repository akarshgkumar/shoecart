const express = require('express');
const router = express.Router();

// Import sub-routers
const userAccountRoutes = require('./user/userAccountRoutes');
const userCartRoutes = require('./user/userCartRoutes');
const userOrderRoutes = require('./user/userOrderRoutes');
const userProductRoutes = require('./user/userProductRoutes');
const userWishlistRoutes = require('./user/userWishlistRoutes');

// Import middlewares
const authMiddleware = require('../middlewares/user/authMiddleware');
const cartAndWishlistMiddleware = require('../middlewares/user/cartAndWishlistMiddleware');
const fetchCategoryMiddleware = require("../middlewares/fetchCategory");

// Middleware: Set user login status
router.use(authMiddleware.setLoginStatus);

// Middleware: Fetch user from token
router.use(authMiddleware.fetchUserFromToken);

// Middleware: Fetch category
router.use(fetchCategoryMiddleware);

// Middleware: Fetch user cart
router.use(cartAndWishlistMiddleware.fetchCartForUser);

// Middleware: Fetch user wishlist
router.use(cartAndWishlistMiddleware.fetchWishlistForUser);

// Routes: User account operations
router.use('/', userAccountRoutes);

// Routes: User cart operations
router.use('/cart', userCartRoutes);

// Routes: User order operations
router.use('/order', userOrderRoutes);

// Routes: Product operations
router.use('/product', userProductRoutes);

// Routes: User wishlist operations
router.use('/wishlist', userWishlistRoutes);

module.exports = router;

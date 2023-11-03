const express = require('express');
const router = express.Router();

// Import sub-routers
const accountRoutes = require('./admin/adminAccountRoutes');
const bannerRoutes = require('./admin/adminBannerRoutes');
const brandRoutes = require('./admin/adminBrandRoutes');
const categoryRoutes = require('./admin/adminCategoryRoutes');
const couponRoutes = require('./admin/adminCouponRoutes');
const orderRoutes = require('./admin/adminOrderRoutes');
const productRoutes = require('./admin/adminProductRoutes');
const userRoutes = require('./admin/adminUserRoutes');

// Routes: Admin account operations
router.use('/', accountRoutes);

// Routes: Brand operations
router.use('/brand', brandRoutes);

// Routes: Category operations
router.use('/category', categoryRoutes);

// Routes: Order management
router.use('/order', orderRoutes);

// Routes: Product management
router.use('/product', productRoutes);

// Routes: Admin user operations
router.use('/user', userRoutes);

// Routes: Banner operations
router.use('/banner', bannerRoutes);

// Routes: Coupon operations
router.use('/coupon', couponRoutes);

module.exports = router;

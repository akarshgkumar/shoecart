const express = require('express');
const router = express.Router();
const UserController = require('../../controllers/admin/adminUserController');

// Route to search users based on certain criteria
router.get('/search-users', UserController.searchUsers);

// Route to display a list of all users
router.get('/view-users', UserController.viewUsers);

// Route to unblock a user by their ID
router.get('/unblock-user/:userId', UserController.unblockUser);

// Route to block a user by their ID
router.get('/block-user/:userId', UserController.blockUser);

module.exports = router;

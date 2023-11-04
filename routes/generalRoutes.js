const express = require('express');
const router = express.Router();

// Redirect for root path
router.get("/", (req, res) => {
  res.redirect("/home");
});

module.exports = router;

const express = require("express");
const router = express.Router();
const User = require("../../models/User");

router.get("/search-users", async (req, res) => {
  const searchTerm = req.query.q;

  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 10,
    customLabels: {
      docs: "users",
      totalDocs: "userCount",
    },
  };

  try {
    let filter = { verified: true };

    if (searchTerm) {
      filter['name'] = new RegExp(searchTerm, 'i');
    }

    const result = await User.paginate(filter, options);

    if (result.userCount === 0) {
      req.flash("error", "No users found");
      return res.redirect("/admin/view-users");
    }

    res.render("admin/admin-view-users", {
      users: result.users,
      userCount: result.userCount,
      current: result.page,
      pages: result.totalPages,
    });

  } catch (error) {
    console.error("Search error:", error);
    req.flash("error", "Unexpected Error");
    res.redirect("/admin/view-users");
  }
});

router.get("/view-users", async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 10,
    customLabels: {
      docs: "users",
      totalDocs: "userCount",
    },
  };

  const filter = { verified: true };

  try {
    const result = await User.paginate(filter, options);
    res.render("admin/admin-view-users", {
      users: result.users,
      userCount: result.userCount,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.redirect("back");
  }
});

router.get("/unblock-user/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("Invalid User ID");
    }
    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked: false },
      { new: true }
    );
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.redirect("/admin/view-users");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.get("/block-user/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("Invalid User ID");
    }
    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked: true },
      { new: true }
    );
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.redirect("/admin/view-users");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});
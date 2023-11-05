const User = require("../../models/User");
const mongoose = require("mongoose");

exports.searchUsers = async (req, res) => {
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
      filter.$or = [
        { name: new RegExp(searchTerm, "i") },
        { email: new RegExp(searchTerm, "i") },
      ];
    }

    const result = await User.paginate(filter, options);
    if (result.userCount === 0) {
      req.flash("error", "No users found");
      return res.redirect("/admin/user/view-users");
    }

    res.render("admin/admin-view-users", {
      users: result.users,
      userCount: result.userCount,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (error) {
    
    req.flash("error", "Unexpected Error");
    res.redirect("/admin/user/view-users");
  }
};

exports.viewUsers = async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: 10,
    customLabels: {
      docs: "users",
      totalDocs: "userCount",
    },
  };

  try {
    const filter = { verified: true };
    const result = await User.paginate(filter, options);
    res.render("admin/admin-view-users", {
      users: result.users,
      userCount: result.userCount,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (error) {
    
    res.redirect("back");
  }
};

exports.unblockUser = async (req, res) => {
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
    res.redirect("/admin/user/view-users");
  } catch (error) {
    
    res.status(500).send("Server Error");
  }
};

exports.blockUser = async (req, res) => {
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
    res.redirect("/admin/user/view-users");
  } catch (error) {
    
    res.status(500).send("Server Error");
  }
};

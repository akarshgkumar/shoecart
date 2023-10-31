const express = require("express");
const router = express.Router();
const Brand = require("../../models/Brand");
const capitalizeWords = require("../../middlewares/admin/capitalizeWords");

router.get("/view-brands", async (req, res) => {
  const options = {
    sort: { productCount: -1 },
    page: parseInt(req.query.page) || 1,
    limit: 10,
  };

  try {
    const result = await Brand.paginate({}, options);
    res.render("admin/admin-view-brands", {
      brands: result.docs,
      brandCount: result.totalDocs,
      current: result.page,
      pages: result.totalPages,
    });
  } catch (err) {
    console.error("Error fetching brands:", err);
    res.redirect("back");
  }
});

router.get("/add-brands", (req, res) => {
  res.render("admin/admin-add-brands");
});

router.post("/add-brands", async (req, res) => {
  try {
    const newBrand = new Brand({
      name: capitalizeWords(req.body.brand_name),
    });
    await newBrand.save();
    res.redirect("/admin/view-brands");
  } catch (err) {
    console.error("Error while adding brand:", err);
    res.end("error", err);
  }
});

router.get("/edit-brand/:brandId", async (req, res) => {
  const brandId = req.params.brandId;
  const brand = await Brand.findOne({ _id: brandId });
  if (brand) {
    res.render("admin/admin-edit-brand", { brand });
  } else {
    res.send("invalid brand");
  }
});

router.post("/edit-brand/:brandId", async (req, res) => {
  const brand = await Brand.findById(req.params.brandId);
  if (!brand) {
    return res.status(404).send("Brand not found");
  }
  const brandName = req.body.brand_name || brand.name;
  brand.name = capitalizeWords(brandName);
  await brand.save();
  res.redirect("/admin/view-brands");
});

router.get("/check-brand/:name", async (req, res) => {
  try {
    const brand = await Brand.findOne({
      name: { $regex: `^${req.params.name}$`, $options: "i" },
    });
        if (brand) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});


router.get("/search-brands", async (req, res) => {
  const searchTerm = req.query.q;
  const options = {
    sort: { productCount: -1 },
    page: parseInt(req.query.page) || 1,
    limit: 10,
  };

  const query = searchTerm ? { name: new RegExp(searchTerm, "i") } : {};

  try {
    const result = await Brand.paginate(query, options);
    if (result.docs.length === 0) {
      req.flash("error", "No brands found for the given search term.");
      if (req.headers.referer) {
        return res.redirect("back");
      } else {
        return res.redirect("/admin/view-brands");
      }
    }

    res.render("admin/admin-view-brands", {
      brands: result.docs,
      brandCount: result.totalDocs,
      current: result.page,
      pages: result.totalPages,
      searchTerm: searchTerm,
    });
  } catch (err) {
    console.error("Error fetching and paginating brands:", err);
    res.redirect("back");
  }
});

module.exports = router;

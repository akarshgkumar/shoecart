require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Admin, Product, category, Category, Brand } = require("./mongodb");
const JWT_SECRET = process.env.SESSION_SECRET;
const cookieParser = require("cookie-parser");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: "shoecart",
});
const parser = multer({ storage: storage });

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

function authenticateJWT(req, res, next) {
  let token = req.cookies.jwt;
  if (!token && req.headers.authorization) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.redirect("/login");
      }
      req.user = user;
      next();
    });
  } else {
    res.redirect("/login");
  }
}

function authenticateAdmin(req, res, next) {
  let token = req.cookies.adminJwt;
  if (!token) {
    return res.redirect("/admin");
  }

  jwt.verify(token, JWT_SECRET, (err, admin) => {
    if (err) {
      return res.redirect("/admin");
    }
    req.admin = admin;
    next();
  });
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.get("/", authenticateJWT, (req, res) => {
  res.redirect("/home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  const error = req.query.error;
  res.render("signup", { error });
});

app.get("/home", (req, res) => {
  res.render("home");
});

app.get("/admin", (req, res) => {
  res.render("admin-login");
});

app.get("/admin/dashboard", authenticateAdmin, (req, res) => {
  res.render("admin-dashboard");
});

app.get("/enter-otp", (req, res) => {
  const error = req.query.error;
  const email = req.query.email;
  res.render("enter-otp", { error, email });
});

app.get("/verify-email", (req, res) => {
  const error = req.query.error;
  res.render("verify-email", { error });
});

app.post("/verify-email", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    console.log(`No user found with email: ${email}`);
    res.redirect("/verify-email?error=User%20not%20found");
  } else {
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000;
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const msg = {
      to: req.body.email,
      from: { email: process.env.EMAIL },
      subject: "Your OTP for Signup",
      text: `Your OTP for signup is: ${otp}. It is valid for only 10 minutes.`,
    };

    sgMail
      .send(msg)
      .then(() => {
        res.redirect("/enter-otp?email=" + encodeURIComponent(req.body.email));
      })
      .catch((error) => {
        console.error(error);
        console.error("Error sending mail:", error.response.body.errors);
        res.status(500).send("Internal Server Error");
      });
  }
});

app.post(
  "/admin/add-product",
  parser.array("image"),
  async (req, res, next) => {
    try {
      let imageUrls = req.files.map((file) => file.path);
      const product = new Product({
        name: req.body.product_name,
        color: req.body.product_color,
        size: req.body.product_size,
        category: mongoose.Types.ObjectId(req.body.product_category),
        category: mongoose.Types.ObjectId(req.body.product_category),
        description: req.body.description,
        stock: req.body.stock,
        price: req.body.price,
        estProfit: req.body.estProfit,
        images: imageUrls,
        isDeleted: false,
      });

      const result = await product.save();
      console.log("result :", result);
      res.redirect("/admin/view-products");
    } catch (err) {
      console.log("Error while adding product:", err);
      res.end("error", err);
    }
  }
);

app.post("/signup", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000;
    const data = {
      name: req.body.name,
      email: req.body.email,
      phoneNo: req.body.phoneNo,
      password: hashedPassword,
      otp,
      otpExpires,
    };
    await User.create(data);
    const msg = {
      to: req.body.email,
      from: { email: process.env.EMAIL },
      subject: "Your OTP for Signup",
      text: `Your OTP for signup is: ${otp}. It is valid for only 10 minutes.`,
    };
    sgMail
      .send(msg)
      .then(() => {
        res.redirect("/enter-otp?email=" + encodeURIComponent(req.body.email));
      })
      .catch((error) => {
        console.error(error);
        console.error("Error sending mail:", error.response.body.errors);
        res.status(500).send("Internal Server Error");
      });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      res.redirect("/signup?error=Email%20already%20exists");
    } else {
      res.status(500).send("Internal Server Error");
    }
  }
});

app.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found for email:", email);
      return res.json({ success: false, message: "User not found" });
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000;
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const msg = {
      to: email,
      from: { email: process.env.EMAIL },
      subject: "Your Resend OTP for Signup",
      text: `Your OTP for signup is: ${otp}. It is valid for only 10 minutes.`,
    };

    sgMail
      .send(msg)
      .then(() => {
        res.json({ success: true, message: "OTP sent successfully" });
      })
      .catch((error) => {
        console.error("Error sending mail:", error.response?.body?.errors);
        res.json({
          success: false,
          message: "Error sending OTP. Please try again later.",
        });
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    console.log(`No user found with email: ${email}`);
    return res.redirect("/signup?error=User%20not%20found");
  }

  if (otp === user.otp && Date.now() <= user.otpExpires) {
    user.verified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = jwt.sign({ email: user.email, name: user.name }, JWT_SECRET, {
      expiresIn: "730d",
    });
    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 730 * 24 * 60 * 60 * 1000,
    });

    res.redirect("/home");
  } else {
    res.redirect(
      `/enter-otp?error=Invalid%20or%20expired%20OTP&email=${encodeURIComponent(
        email
      )}`
    );
  }
});

app.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user && (await bcrypt.compare(req.body.password, user.password))) {
      const token = jwt.sign(
        { email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: "730d" }
      );
      res.cookie("jwt", token, {
        httpOnly: true,
        maxAge: 730 * 24 * 60 * 60 * 1000,
      });
      res.redirect("/home");
    } else {
      res.render("login", { notFound: "Incorrect email or password" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

app.post("/verify-email", async (req, res) => {
  const email = req.body.email;
  const user = await User.findOne({ email });

  if (user) {
    // Generate OTP and set its expiration time
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Update the user in the database with the generated OTP
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send the OTP via email
    const msg = {
      to: email,
      from: { email: process.env.EMAIL },
      subject: "Your OTP for Login",
      text: `Your OTP for login is: ${otp}. It is valid for only 10 minutes.`,
    };

    sgMail
      .send(msg)
      .then(() => {
        // Redirect to enter-otp page
        res.redirect("/enter-otp?email=" + encodeURIComponent(email));
      })
      .catch((error) => {
        console.error("Error sending mail:", error.response?.body?.errors);
        res.redirect(
          "/verify-email?error=Error sending OTP. Please try again later."
        );
      });
  } else {
    res.redirect("/verify-email?error=Email not found in our records.");
  }
});

app.post("/admin", async (req, res) => {
  try {
    const admin = await Admin.findOne({ userName: req.body.userName });
    if (admin && (await bcrypt.compare(req.body.password, admin.password))) {
      const adminToken = jwt.sign({ userName: admin.userName }, JWT_SECRET, {
        expiresIn: "730d",
      });
      res.cookie("adminJwt", adminToken, {
        httpOnly: true,
        maxAge: 730 * 24 * 60 * 60 * 1000,
      });
      res.redirect("/admin/dashboard");
    } else {
      res.render("admin-login", { notFound: "Incorrect username or password" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

app.get("/admin/view-products", async (req, res) => {
  try {
    const products = await Product.find();
    res.render("admin-view-products", { products });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/admin/edit-product/:productId", async (req, res) => {
  const productId = req.params.productId;
  const product = await Product.findOne({ _id: productId });
  if (product) {
    res.render("admin-edit-product", { product });
  } else {
    res.send("invalid product");
  }
});

app.post(
  "/admin/edit-product/:productId",
  parser.array("image"),
  async (req, res) => {
    const productId = req.params.productId;
    try {
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).send("Product not found");
      }

      const sizes = req.body.product_sizes || [];
      const numericSizes = sizes.map(Number); // Convert the sizes to numbers
      const updatedProductData = {
        name: req.body.product_name,
        color: req.body.product_color,
        sizes: numericSizes,
        category: mongoose.Types.ObjectId(req.body.product_category),
        category: mongoose.Types.ObjectId(req.body.product_category),
        description: req.body.description,
        price: req.body.price,
        stock: req.body.stock,
        mainImage: req.files[0].path,
        estProfit: req.body.estProfit,
      };

      // Retrieve new image URLs from the uploaded files, excluding the first (main) image
      const newImageUrls = req.files.slice(1).map((file) => file.path);

      // Check which images to delete based on checkboxes
      const retainedImages = [];
      for (let i = 0; i < product.images.length; i++) {
        const deleteCheckbox = req.body[`deleteImage${i}`];
        if (deleteCheckbox === "on") {
          retainedImages.push(product.images[i]);
        }
      }

      // Update the allImageUrls with retained and new images
      const allImageUrls = retainedImages.concat(newImageUrls);
      updatedProductData.images = allImageUrls;

      // Update the product data in the database
      await Product.findByIdAndUpdate(productId, updatedProductData);

      // Redirect to the product view page
      res.redirect("/admin/view-products");
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
);

// Soft Delete
app.get("/admin/delete-product/:productId", async (req, res) => {
  const productId = req.params.productId;
  try {
    await Product.findByIdAndUpdate(productId, { isDeleted: true });
    res.redirect("/admin/view-products");
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

// Search Product
app.get("/admin/search-product", async (req, res) => {
  const searchTerm = req.query.q;
  try {
    const products = await Product.find({
      name: new RegExp(searchTerm, "i"),
      isDeleted: false,
    });
    res.render("admin-view-products", { products });
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

app.get("/admin/add-product", authenticateAdmin, (req, res) => {
  res.render("admin-add-product");
});

app.get("/admin/edit-category/:categoryId", async (req, res) => {
  const categoryId = req.params.categoryId;
  const category = await Category.findOne({ _id: categoryId });
  if (category) {
    res.render("admin-edit-category", { category });
  } else {
    res.send("invalid category");
  }
});

app.get("/admin/edit-brand/:brandId", async (req, res) => {
  const brandId = req.params.brandId;
  const brand = await Brand.findOne({ _id: brandId });
  if (brand) {
    res.render("admin-edit-brand", { brand });
  } else {
    res.send("invalid brand");
  }
});

app.post("/admin/edit-category/:categoryId", async (req, res) => {
  const categoryId = req.params.categoryId;
  try {
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).send("category not found");
    }

    const updatedcategoryData = {
      name: req.body.category_name
    } 

    await Category.findByIdAndUpdate(categoryId, updatedcategoryData);

    res.redirect("/admin/view-category");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/admin/edit-brand/:brandId", async (req, res) => {
  const brandId = req.params.brandId;
  try {
    const brand = await Brand.findById(brandId);

    if (!brand) {
      return res.status(404).send("brand not found");
    }

    const updatedbrandData = {
      name: req.body.brand_name
    } 

    await Brand.findByIdAndUpdate(brandId, updatedbrandData);

    res.redirect("/admin/view-brands");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/admin/view-brands", async (req, res) => {
  const brands = await Brand.find();
  res.render("admin-view-brands", { brands });
});


app.get("/admin/view-category", async (req, res) => {
  const category = await Category.find();
  console.log(category);
  res.render("admin-view-category", { category });
});

app.post("/admin/add-category", async (req, res) => {
  try {
    const newCategory = new Category({
      name: req.body.category_name,
      isDeleted: false,
    });
    await newCategory.save();
    res.redirect("/admin/view-category");
  } catch (err) {
    console.error("Error while adding category:", err);
    res.end("error", err);
  }
});

app.post("/admin/add-brands", async (req, res) => {
  try {
    const newBrands = new Brand({
      name: req.body.brand_name,
      isDeleted: false,
    });
    await newBrands.save();
    res.redirect("/admin/view-brands");
  } catch (err) {
    console.error("Error while adding brand:", err);
    res.end("error", err);
  }
});

app.get("/admin/delete-category/:categoryId", async (req, res) => {
  try {
    await Category.findByIdAndUpdate(req.params.categoryId, {
      isDeleted: true,
    });
    res.redirect("/admin/view-category");
  } catch (err) {
    console.error("Error while deleting category:", err);
    res.end("error", err);
  }
});

app.get("/admin/delete-brand/:brandsId", async (req, res) => {
  try {
    await Brand.findByIdAndUpdate(req.params.brandsId, {
      isDeleted: true,
    });
    res.redirect("/admin/view-brands");
  } catch (err) {
    console.error("Error while deleting brands:", err);
    res.end("error", err);
  }
});


app.get("/admin/add-category", (req, res) => {
  res.render("admin-add-category");
});

app.get("/admin/add-brands", (req, res) => {
  res.render("admin-add-brands");
});


app.get("/admin/search-category", async (req, res) => {
  const searchTerm = req.query.q;
  try {
    const category = await Category.find({
      name: new RegExp(searchTerm, "i"),
      isDeleted: false,
    });
    res.render("admin-view-category", { category });
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

app.get("/admin/search-brands", async (req, res) => {
  const searchTerm = req.query.q;
  try {
    const brands = await Brand.find({
      name: new RegExp(searchTerm, "i"),
      isDeleted: false,
    });
    res.render("admin-view-brands", { brands });
  } catch (err) {
    console.log(err)
    res.status(500).send("Internal Server Error");
  }
});



app.listen(3000, () => console.log("running at port 3000"));

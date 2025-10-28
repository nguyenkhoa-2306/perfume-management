const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const router = express.Router();

// MODELS
const Member = require("../models/Member");
const Perfume = require("../models/Perfume");
const Brand = require("../models/Brand");

// MIDDLEWARE
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/authAdmin");

// SESSION CHECK MIDDLEWARE
const checkUser = (req, res, next) => {
  req.user = req.session.user || null;
  next();
};

// ✅ MIDDLEWARE TỰ ĐỘNG THÊM BIẾN VÀO RES.LOCALS
router.use((req, res, next) => {
  res.locals.path = req.path;
  res.locals.user = req.session.user || null;
  res.locals.messages = {
    success: req.flash('success'),
    error: req.flash('error')
  };
  next();
});

// ========== 1. HOME PAGE ==========
router.get("/", checkUser, async (req, res) => {
  try {
    const perfumes = await Perfume.find().populate("brand", "brandName").lean();
    const brands = await Brand.find().lean();

    res.render("pages/index", {
      title: "PerfumeHub",
      perfumes: perfumes || [],
      brands: brands || [],
    });
  } catch (error) {
    console.error("Error loading home:", error);
    res.render("pages/index", {
      title: "PerfumeHub",
      perfumes: [],
      brands: [],
    });
  }
});

// ========== 2. SEARCH ==========
router.get("/search", checkUser, async (req, res) => {
  try {
    const { q } = req.query;
    const perfumes = await Perfume.find({
      perfumeName: { $regex: q || "", $options: "i" }
    }).populate("brand", "brandName").lean();
    
    const brands = await Brand.find().lean();
    
    res.render("pages/index", {
      title: "Search Results",
      perfumes,
      brands
    });
  } catch (error) {
    console.error("Search error:", error);
    res.redirect("/");
  }
});

// ========== 3. FILTER BY BRAND ==========
router.get("/filter", checkUser, async (req, res) => {
  try {
    const { brand } = req.query;
    const brands = await Brand.find().lean();
    
    let perfumes;
    if (brand) {
      const brandDoc = await Brand.findOne({ brandName: brand });
      if (brandDoc) {
        perfumes = await Perfume.find({ brand: brandDoc._id })
          .populate("brand", "brandName").lean();
      } else {
        perfumes = [];
      }
    } else {
      perfumes = await Perfume.find().populate("brand", "brandName").lean();
    }
    
    res.render("pages/index", {
      title: "Filter Results",
      perfumes,
      brands
    });
  } catch (error) {
    console.error("Filter error:", error);
    res.redirect("/");
  }
});

// ========== 4. LOGIN PAGE (GET) ==========
router.get("/login", checkUser, (req, res) => {
  if (req.user) {
    return res.redirect("/");
  }
  res.render("pages/login", { 
    title: "Login"
  });
});

// ========== 5. LOGIN (POST) ==========
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log("🔐 Login attempt:", email);
    
    const member = await Member.findOne({ email }).select("+password");

    if (!member) {
      console.log("❌ Member not found");
      req.flash("error", "Invalid email or password");
      return res.redirect("/login");
    }
    
    const isMatch = await member.comparePassword(password);
    if (!isMatch) {
      console.log("❌ Password incorrect");
      req.flash("error", "Invalid email or password");
      return res.redirect("/login");
    }

    // ✅ LOGIN SUCCESS
    req.session.user = {
      id: member._id,
      name: member.name,
      email: member.email,
      isAdmin: member.isAdmin,
    };
    
    console.log("✅ Login success:", email);
    req.flash("success", "Login successful!");
    res.redirect("/");
    
  } catch (error) {
    console.error("❌ Login error:", error);
    req.flash("error", "Login failed");
    res.redirect("/login");
  }
});

// ========== 6. REGISTER PAGE (GET) ==========
router.get("/register", checkUser, (req, res) => {
  console.log("📄 GET /register called");
  
  if (req.user) {
    console.log("⚠️ User already logged in, redirecting to home");
    return res.redirect("/");
  }
  
  res.render("pages/register", { 
    title: "Register"
  });
});

// ========== 7. REGISTER (POST) ==========
router.post("/register", async (req, res) => {
  console.log("========== REGISTER DEBUG ==========");
  console.log("1. Request body:", req.body);
  console.log("2. MongoDB state:", mongoose.connection.readyState);
  
  try {
    const { email, password, name, YOB, gender } = req.body;
    
    // Validate
    if (!email || !password || !name || !YOB || gender === undefined) {
      console.log("❌ Missing required fields");
      req.flash("error", "All fields are required");
      return res.redirect("/register");
    }
    
    // Check existing email
    const existingMember = await Member.findOne({ email });
    if (existingMember) {
      console.log("❌ Email already exists:", email);
      req.flash("error", "Email already exists");
      return res.redirect("/register");
    }
    
    // Create member
    const member = new Member({
      email,
      password,
      name,
      YOB: parseInt(YOB),
      gender: gender === "true" || gender === true,
      isAdmin: false
    });
    
    console.log("3. Saving member:", email);
    await member.save();
    console.log("✅ Member saved successfully");
    
    // Verify
    const check = await Member.findOne({ email });
    console.log("4. Verification:", check ? "✅ Found in DB" : "❌ Not found");
    
    req.flash("success", "Registration successful! Please login.");
    res.redirect("/login");
    
  } catch (error) {
    console.error("❌ Registration error:", error);
    req.flash("error", error.message || "Registration failed");
    res.redirect("/register");
  }
});

// ========== 8. PROFILE PAGE ==========
router.get("/profile", checkUser, async (req, res) => {
  if (!req.user) {
    return res.redirect("/login");
  }
  
  try {
    const member = await Member.findById(req.user.id).lean();
    res.render("pages/profile", { 
      title: "Profile", 
      member
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.redirect("/");
  }
});

// ========== 9. UPDATE PROFILE ==========
router.post("/profile", checkUser, async (req, res) => {
  if (!req.user) {
    return res.redirect("/login");
  }
  
  try {
    await Member.findByIdAndUpdate(req.user.id, {
      name: req.body.name,
      YOB: parseInt(req.body.YOB),
      gender: req.body.gender === "true",
    });
    
    req.flash("success", "Profile updated!");
    res.redirect("/profile");
  } catch (error) {
    console.error("Update profile error:", error);
    req.flash("error", "Failed to update profile");
    res.redirect("/profile");
  }
});

// ========== 10. CHANGE PASSWORD PAGE ==========
router.get("/change-password", checkUser, (req, res) => {
  if (!req.user) {
    return res.redirect("/login");
  }
  
  res.render("pages/change-password", {
    title: "Change Password"
  });
});

// ========== 11. CHANGE PASSWORD (POST) ==========
router.post("/change-password", checkUser, async (req, res) => {
  if (!req.user) {
    return res.redirect("/login");
  }
  
  try {
    const member = await Member.findById(req.user.id).select("+password");
    
    const isMatch = await member.comparePassword(req.body.currentPassword);
    if (!isMatch) {
      req.flash("error", "Current password is incorrect");
      return res.redirect("/change-password");
    }
    
    member.password = req.body.newPassword;
    await member.save();
    
    req.flash("success", "Password changed successfully!");
    res.redirect("/profile");
  } catch (error) {
    console.error("Change password error:", error);
    req.flash("error", "Failed to change password");
    res.redirect("/change-password");
  }
});

// ========== 12. MY COMMENTS ==========
router.get("/my-comments", checkUser, async (req, res) => {
  if (!req.user) {
    return res.redirect("/login");
  }
  
  try {
    const perfumes = await Perfume.find({ "comments.author": req.user.id })
      .populate("brand", "brandName")
      .lean();

    const comments = perfumes.map((p) => {
      const comment = p.comments.find(
        (c) => c.author.toString() === req.user.id.toString()
      );
      return {
        perfumeName: p.perfumeName,
        perfumeId: p._id,
        brand: p.brand.brandName,
        rating: comment.rating,
        content: comment.content,
        createdAt: comment.createdAt,
      };
    });

    res.render("pages/my-comments", {
      title: "My Comments",
      comments
    });
  } catch (error) {
    console.error("My comments error:", error);
    res.render("pages/my-comments", {
      title: "My Comments",
      comments: []
    });
  }
});

// ========== 13. PERFUME DETAIL ==========
router.get("/perfumes/:id", checkUser, async (req, res) => {
  try {
    const perfume = await Perfume.findById(req.params.id)
      .populate("brand", "brandName")
      .populate("comments.author", "name")
      .lean();

    if (!perfume) {
      return res.status(404).render("pages/404", { title: "Not Found" });
    }

    res.render("pages/perfume-detail", {
      title: perfume.perfumeName,
      perfume
    });
  } catch (error) {
    console.error("Perfume detail error:", error);
    res.redirect("/");
  }
});

// ========== 14. ADMIN DASHBOARD ==========
router.get("/admin", checkUser, async (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    req.flash("error", "Admin access required");
    return res.redirect("/");
  }
  
  try {
    const [perfumes, brands, members] = await Promise.all([
      Perfume.countDocuments(),
      Brand.countDocuments(),
      Member.countDocuments(),
    ]);

    res.render("pages/admin/dashboard", {
      title: "Dashboard",
      stats: { perfumes, brands, members, comments: 0 }
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.redirect("/");
  }
});

// ========== 15. ADMIN BRANDS ==========
router.get("/admin/brands", checkUser, async (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    req.flash("error", "Admin access required");
    return res.redirect("/");
  }
  
  try {
    const brands = await Brand.find().lean();
    res.render("pages/admin/brands", { 
      title: "Brands", 
      brands
    });
  } catch (error) {
    console.error("Admin brands error:", error);
    res.redirect("/admin");
  }
});

router.post("/admin/brands", checkUser, async (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    return res.redirect("/");
  }
  
  try {
    await Brand.create({ brandName: req.body.brandName });
    req.flash("success", "Brand created!");
    res.redirect("/admin/brands");
  } catch (error) {
    console.error("Create brand error:", error);
    req.flash("error", "Failed to create brand");
    res.redirect("/admin/brands");
  }
});

// ========== 16. ADMIN PERFUMES ==========
router.get("/admin/perfumes", checkUser, async (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    req.flash("error", "Admin access required");
    return res.redirect("/");
  }
  
  try {
    const [perfumes, brands] = await Promise.all([
      Perfume.find().populate("brand").lean(),
      Brand.find().lean(),
    ]);
    
    res.render("pages/admin/perfumes", {
      title: "Perfumes",
      perfumes,
      brands
    });
  } catch (error) {
    console.error("Admin perfumes error:", error);
    res.redirect("/admin");
  }
});

router.post("/admin/perfumes", checkUser, async (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    return res.redirect("/");
  }
  
  try {
    await Perfume.create(req.body);
    req.flash("success", "Perfume created!");
    res.redirect("/admin/perfumes");
  } catch (error) {
    console.error("Create perfume error:", error);
    req.flash("error", "Failed to create perfume");
    res.redirect("/admin/perfumes");
  }
});

// ========== 17. ADMIN COLLECTORS ==========
router.get("/admin/collectors", checkUser, async (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    req.flash("error", "Admin access required");
    return res.redirect("/");
  }
  
  try {
    const members = await Member.find().select("-password").lean();
    res.render("pages/admin/collectors", {
      title: "Collectors",
      members
    });
  } catch (error) {
    console.error("Admin collectors error:", error);
    res.redirect("/admin");
  }
});

// ========== 18. LOGOUT ==========
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.redirect("/");
  });
});

module.exports = router;
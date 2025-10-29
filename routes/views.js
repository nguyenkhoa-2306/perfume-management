const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Member = require("../models/Member");
const Perfume = require("../models/Perfume");
const Brand = require("../models/Brand");

// Middleware để cung cấp user và flash message cho view
const checkUser = (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.messages = {
    success: req.flash("success"),
    error: req.flash("error"),
  };
  next();
};

// Middleware kiểm tra admin quyền
const ensureAdmin = (req, res, next) => {
  if (!req.session.user || !req.session.user.isAdmin) {
    req.flash("error", "Access denied");
    return res.redirect("/");
  }
  next();
};

// Trang chủ
router.get("/", checkUser, async (req, res) => {
  try {
    const perfumes = await Perfume.find().populate("brand", "brandName").lean();
    const brands = await Brand.find().lean();

    res.render("pages/index", {
      title: "PerfumeHub",
      perfumes,
      brands,
    });
  } catch (error) {
    console.error("Home error:", error);
    res.render("pages/index", {
      title: "PerfumeHub",
      perfumes: [],
      brands: [],
    });
  }
});

// Detail + feedback
router.get("/perfumes/:id", checkUser, async (req, res) => {
  try {
    const perfume = await Perfume.findById(req.params.id)
      .populate("brand", "brandName")
      .populate("comments.author", "name")
      .lean();

    if (!perfume)
      return res.status(404).render("pages/404", { title: "Not Found" });

    const user = req.session.user;
    let hasCommented = false;

    if (user) {
      hasCommented = perfume.comments.some(
        (c) => c.author && c.author._id.toString() === user.id.toString()
      );
    }

    res.render("pages/detail", {
      title: perfume.perfumeName,
      perfume,
      user,
      hasCommented,
    });
  } catch (error) {
    console.error("Detail error:", error);
    res.redirect("/");
  }
});

router.post("/perfumes/:id/comment", checkUser, async (req, res) => {
  try {
    // ID nước hoa
    const perfumeId = req.params.id;
    const { rating, content } = req.body;

    const perfume = await Perfume.findById(perfumeId);
    if (!perfume) {
      req.flash("error", "Perfume not found");
      return res.redirect(`/perfumes/${perfumeId}`);
    }

    const userId = req.session.user.id;

    const existingComment = perfume.comments.find(
      (c) => c.author.toString() === userId
    );
    if (existingComment) {
      req.flash("error", "You already commented this perfume");
      return res.redirect(`/perfumes/${perfumeId}`);
    }

    // Thêm comment
    perfume.comments.push({
      rating,
      content,
      author: userId,
    });
    await perfume.save();

    req.flash("success", "Comment added!");
    return res.redirect(`/perfumes/${perfumeId}`);
  } catch (error) {
    console.error("Add comment error:", error);
    req.flash("error", "Could not add comment");
    return res.redirect(`/perfumes/${req.params.id}`);
  }
});

// Search
router.get("/search", checkUser, async (req, res) => {
  try {
    const { q } = req.query;
    const brands = await Brand.find().lean();

    if (!q || q.trim() === "") {
      req.flash("error", "Please enter a search keyword");
      return res.redirect("/");
    }

    const perfumes = await Perfume.find({
      perfumeName: { $regex: q, $options: "i" },
    })
      .populate("brand", "brandName")
      .lean();

    res.render("pages/index", {
      title: `Search results for "${q}"`,
      perfumes,
      brands,
    });
  } catch (error) {
    console.error("Search error:", error);
    req.flash("error", "Failed to search perfumes");
    res.redirect("/");
  }
});

// Filter by brand
router.get("/filter", checkUser, async (req, res) => {
  try {
    const { brand } = req.query;
    const brands = await Brand.find().lean();

    if (!brand || brand.trim() === "") {
      req.flash("error", "Please select a brand");
      return res.redirect("/");
    }

    const perfumes = await Perfume.find()
      .populate("brand", "brandName")
      .lean()
      .then((perfumes) =>
        perfumes.filter(
          (p) => p.brand.brandName.toLowerCase() === brand.toLowerCase()
        )
      );

    res.render("pages/index", {
      title: `Filter by ${brand}`,
      perfumes,
      brands,
    });
  } catch (error) {
    console.error("Filter error:", error);
    req.flash("error", "Failed to filter perfumes");
    res.redirect("/");
  }
});

// Login & Register & Profile routes
router.get("/login", checkUser, (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("pages/login", { title: "Login" });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const member = await Member.findOne({ email }).select("+password");
    if (!member) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/login");
    }

    const isMatch = await member.comparePassword(password);
    if (!isMatch) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/login");
    }

    req.session.user = {
      id: member._id,
      name: member.name,
      email: member.email,
      isAdmin: member.isAdmin,
    };

    req.flash("success", "Login successful!");

    if (member.isAdmin) {
      return res.redirect("/admin");
    }
    return res.redirect("/");
  } catch (error) {
    console.error("Login error:", error);
    req.flash("error", "Login failed, please try again");
    res.redirect("/login");
  }
});

router.get("/register", checkUser, (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("pages/register", { title: "Register" });
});

router.post("/register", async (req, res) => {
  try {
    const { email, password, name, YOB, gender } = req.body;

    if (!email || !password || !name || !YOB || gender === undefined) {
      req.flash("error", "All fields are required");
      return res.redirect("/register");
    }

    const existing = await Member.findOne({ email });
    if (existing) {
      req.flash("error", "Email already exists");
      return res.redirect("/register");
    }

    const member = new Member({
      email,
      password,
      name,
      YOB: parseInt(YOB),
      gender: gender === "true",
      isAdmin: false,
    });

    await member.save();

    req.flash("success", "Registration successful! Please login.");
    res.redirect("/login");
  } catch (error) {
    console.error("Register error:", error);
    req.flash("error", "Registration failed");
    res.redirect("/register");
  }
});

router.get("/profile", checkUser, async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const member = await Member.findById(req.session.user.id).lean();
    res.render("pages/profile", { title: "Profile", member });
  } catch (error) {
    console.error("Profile error:", error);
    res.redirect("/");
  }
});

router.post("/profile", checkUser, async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const { name, YOB, gender } = req.body;
    const userId = req.session.user.id;

    // Tìm user trong DB
    const member = await Member.findById(userId);
    if (!member) {
      req.flash("error", "User not found");
      return res.redirect("/profile");
    }

    // Cập nhật thông tin, không cho thay email hoặc password
    member.name = name;
    member.YOB = parseInt(YOB);
    member.gender = gender === "true";

    await member.save();

    req.flash("success", "Profile updated successfully!");
    res.redirect("/profile");
  } catch (error) {
    console.error("Update profile error:", error);
    req.flash("error", "Failed to update profile");
    res.redirect("/profile");
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// Admin Dashboard view route
router.get("/admin", checkUser, ensureAdmin, async (req, res) => {
  try {
    const perfumes = await Perfume.find().populate("brand", "brandName").lean();
    const brands = await Brand.find().lean();
    const members = await Member.find().select("-password").lean();

    res.render("pages/admin-dashboard", {
      title: "Admin Dashboard",
      perfumes,
      brands,
      members,
      user: req.session.user,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    req.flash("error", "Failed to load admin dashboard");
    res.redirect("/");
  }
});

/* --------------------------- PERFUME CRUD --------------------------- */

// ➕ Thêm nước hoa
router.post("/admin/perfume/add", checkUser, ensureAdmin, async (req, res) => {
  try {
    const {
      perfumeName,
      brand,
      price,
      description,
      concentration,
      targetAudience,
      uri,
      ingredients,
      volume,
    } = req.body;

    // Kiểm tra dữ liệu
    if (
      !perfumeName ||
      !brand ||
      !price ||
      !concentration ||
      !targetAudience ||
      !uri ||
      !ingredients ||
      !volume
    ) {
      req.flash("error", "All perfume fields are required");
      return res.redirect("/admin");
    }

    const perfume = new Perfume({
      perfumeName,
      brand,
      price,
      description: description || "",
      concentration,
      targetAudience,
      uri,
      ingredients,
      volume,
    });

    await perfume.save();
    req.flash("success", "Perfume added successfully!");
    res.redirect("/admin");
  } catch (error) {
    console.error("Add perfume error:", error);
    req.flash("error", "Failed to add perfume");
    res.redirect("/admin");
  }
});

// ✏️ Sửa nước hoa
router.post(
  "/admin/perfume/edit/:id",
  checkUser,
  ensureAdmin,
  async (req, res) => {
    try {
      const {
        perfumeName,
        brand,
        price,
        description,
        concentration,
        targetAudience,
        uri,
        ingredients,
        volume,
      } = req.body;

      const updatedPerfume = await Perfume.findByIdAndUpdate(
        req.params.id,
        {
          perfumeName,
          brand,
          price,
          description: description || "",
          concentration,
          targetAudience,
          uri,
          ingredients,
          volume,
        },
        { new: true, runValidators: true }
      );

      if (!updatedPerfume) {
        req.flash("error", "Perfume not found");
        return res.redirect("/admin");
      }

      req.flash("success", "Perfume updated successfully!");
      res.redirect("/admin");
    } catch (error) {
      console.error("Update perfume error:", error);
      req.flash("error", "Failed to update perfume");
      res.redirect("/admin");
    }
  }
);

// ❌ Xóa nước hoa
router.post(
  "/admin/perfume/delete/:id",
  checkUser,
  ensureAdmin,
  async (req, res) => {
    try {
      const deleted = await Perfume.findByIdAndDelete(req.params.id);
      if (!deleted) {
        req.flash("error", "Perfume not found");
        return res.redirect("/admin");
      }

      req.flash("success", "Perfume deleted successfully!");
      res.redirect("/admin");
    } catch (error) {
      console.error("Delete perfume error:", error);
      req.flash("error", "Failed to delete perfume");
      res.redirect("/admin");
    }
  }
);

module.exports = router;

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

module.exports = router;

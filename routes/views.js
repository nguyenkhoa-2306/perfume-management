const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

// MODELS
const Member = require("../models/Member");
const Perfume = require("../models/Perfume");
const Brand = require("../models/Brand");

// MIDDLEWARE
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/authAdmin");

// SESSION CHECK
const checkUser = (req, res, next) => {
  req.user = req.session.user || null;
  next();
};

// ========== 1. HOME PAGE ==========
router.get("/", checkUser, async (req, res) => {
  try {
    const perfumes = await Perfume.find().populate("brand", "brandName").lean();
    const brands = await Brand.find().lean();

    res.render("pages/index", {
      title: "PerfumeHub",
      perfumes: perfumes || [],
      brands: brands || [],
      user: req.user,
    });
  } catch (error) {
    res.render("pages/index", {
      title: "PerfumeHub",
      perfumes: [],
      brands: [],
      user: req.user,
    });
  }
});

// ========== 2. LOGIN ==========
router.get("/login", checkUser, (req, res) => {
  if (req.user) return res.redirect("/");
  res.render("pages/login", { title: "Login", user: req.user });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const member = await Member.findOne({ email }).select("+password");

    if (!member || !(await member.comparePassword(password))) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/login");
    }

    req.session.user = {
      id: member._id,
      name: member.name,
      email: member.email,
      isAdmin: member.isAdmin,
    };

    res.redirect("/");
  } catch (error) {
    req.flash("error", "Login failed");
    res.redirect("/login");
  }
});

// ========== 3. REGISTER ==========
router.get("/register", checkUser, (req, res) => {
  if (req.user) return res.redirect("/");
  res.render("pages/register", { title: "Register", user: req.user });
});

router.post("/register", async (req, res) => {
  try {
    const member = new Member({
      ...req.body,
      YOB: parseInt(req.body.YOB),
      gender: req.body.gender === "true",
    });
    await member.save();
    req.flash("success", "Registered! Please login.");
    res.redirect("/login");
  } catch (error) {
    req.flash("error", error.message);
    res.redirect("/register");
  }
});

// ========== 4. PROFILE ==========
router.get("/profile", checkUser, auth, async (req, res) => {
  const member = await Member.findById(req.user.id).lean();
  res.render("pages/profile", { title: "Profile", member, user: req.user });
});

router.post("/profile", checkUser, auth, async (req, res) => {
  await Member.findByIdAndUpdate(req.user.id, {
    name: req.body.name,
    YOB: parseInt(req.body.YOB),
    gender: req.body.gender === "true",
  });
  req.flash("success", "Profile updated!");
  res.redirect("/profile");
});

// ========== 5. CHANGE PASSWORD ==========
router.get("/change-password", checkUser, auth, (req, res) => {
  res.render("pages/change-password", {
    title: "Change Password",
    user: req.user,
  });
});

router.post("/change-password", checkUser, auth, async (req, res) => {
  const member = await Member.findById(req.user.id).select("+password");
  if (!(await member.comparePassword(req.body.currentPassword))) {
    req.flash("error", "Current password wrong");
    return res.redirect("/change-password");
  }
  member.password = await bcrypt.hash(req.body.newPassword, 12);
  await member.save();
  req.flash("success", "Password changed!");
  res.redirect("/profile");
});

// ========== 6. MY COMMENTS ==========
router.get("/my-comments", checkUser, auth, async (req, res) => {
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
    comments,
    user: req.user,
  });
});

// ========== 7. PERFUME DETAIL ==========
router.get("/perfumes/:id", checkUser, async (req, res) => {
  const perfume = await Perfume.findById(req.params.id)
    .populate("brand", "brandName")
    .populate("comments.author", "name")
    .lean();

  if (!perfume)
    return res.status(404).render("pages/404", { title: "Not Found" });

  res.render("pages/perfume-detail", {
    title: perfume.perfumeName,
    perfume,
    user: req.user,
  });
});

// ========== 8. ADMIN DASHBOARD ==========
router.get("/admin", checkUser, auth, adminAuth, async (req, res) => {
  const [perfumes, brands, members] = await Promise.all([
    Perfume.countDocuments(),
    Brand.countDocuments(),
    Member.countDocuments(),
  ]);

  res.render("pages/admin/dashboard", {
    title: "Dashboard",
    stats: { perfumes, brands, members, comments: 0 },
    user: req.user,
  });
});

// ========== 9. ADMIN BRANDS ==========
router.get("/admin/brands", checkUser, auth, adminAuth, async (req, res) => {
  const brands = await Brand.find().lean();
  res.render("pages/admin/brands", { title: "Brands", brands, user: req.user });
});

router.post("/admin/brands", checkUser, auth, adminAuth, async (req, res) => {
  await Brand.create({ brandName: req.body.brandName });
  res.redirect("/admin/brands");
});

// ========== 10. ADMIN PERFUMES ==========
router.get("/admin/perfumes", checkUser, auth, adminAuth, async (req, res) => {
  const [perfumes, brands] = await Promise.all([
    Perfume.find().populate("brand").lean(),
    Brand.find().lean(),
  ]);
  res.render("pages/admin/perfumes", {
    title: "Perfumes",
    perfumes,
    brands,
    user: req.user,
  });
});

router.post("/admin/perfumes", checkUser, auth, adminAuth, async (req, res) => {
  await Perfume.create(req.body);
  res.redirect("/admin/perfumes");
});

// ========== 11. ADMIN COLLECTORS ==========
router.get(
  "/admin/collectors",
  checkUser,
  auth,
  adminAuth,
  async (req, res) => {
    const members = await Member.find().select("-password").lean();
    res.render("pages/admin/collectors", {
      title: "Collectors",
      members,
      user: req.user,
    });
  }
);

// ========== 12. LOGOUT ==========
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

module.exports = router;

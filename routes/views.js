const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Member = require("../models/Member");
const Perfume = require("../models/Perfume");
const Brand = require("../models/Brand");

// ========== Middleware ==========
const checkUser = (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.messages = {
    success: req.flash("success"),
    error: req.flash("error"),
  };
  next();
};

// ========== Trang chủ ==========
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

// ========== Chi tiết sản phẩm + feedback ==========
router.get("/perfumes/:id", checkUser, async (req, res) => {
  try {
    const perfume = await Perfume.findById(req.params.id)
      .populate("brand", "brandName")
      .populate("comments.author", "membername")
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

// ========== Gửi feedback (comment + rating) ==========
router.post("/perfumes/:id/comment", checkUser, async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const { rating, content } = req.body;
    const perfumeId = req.params.id;
    const userId = req.session.user.id;

    const perfume = await Perfume.findById(perfumeId);
    if (!perfume) return res.redirect("/");

    const already = perfume.comments.some(
      (c) => c.author.toString() === userId
    );

    if (already) {
      req.flash("error", "You have already commented on this perfume.");
      return res.redirect(`/perfumes/${perfumeId}`);
    }

    perfume.comments.push({ rating, content, author: userId });
    await perfume.save();

    req.flash("success", "Feedback submitted!");
    res.redirect(`/perfumes/${perfumeId}`);
  } catch (error) {
    console.error("Comment error:", error);
    req.flash("error", "Failed to add feedback");
    res.redirect(`/perfumes/${req.params.id}`);
  }
});

// ========== Login & Register ==========
router.get("/login", checkUser, (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("pages/login", { title: "Login" });
});

router.get("/register", checkUser, (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("pages/register", { title: "Register" });
});

// ========== Profile ==========
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

// ========== Logout ==========
router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

module.exports = router;

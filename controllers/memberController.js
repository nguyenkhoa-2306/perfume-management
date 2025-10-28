const bcrypt = require("bcryptjs");
const Member = require("../models/Member");
const Perfume = require("../models/Perfume");

exports.getAllMembers = async (req, res) => {
  try {
    const members = await Member.find().select("-password").lean();
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ FIXED: updateProfile LOGIC
exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (id !== req.user.id.toString()) {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    if (req.user._id.toString() !== req.params.id) {
      return res
        .status(403)
        .json({ message: "You can only update your own profile" });
    }

    const updates = { ...req.body };
    delete updates.email;
    delete updates.password;

    const member = await Member.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .select("-password")
      .lean();

    if (!member) return res.status(404).json({ message: "Member not found" });

    res.json({ message: "Profile updated", member });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ changePassword - MEMBER ONLY
exports.changePassword = async (req, res) => {
  try {
    console.log("🔐 Change password:", req.user.email);

    const { currentPassword, newPassword } = req.body;
    const member = await Member.findById(req.user.id).select("+password");

    if (!(await member.comparePassword(currentPassword))) {
      return res.status(400).json({ message: "Current password incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    member.password = hashedPassword;
    await member.save();

    console.log("✅ Password changed:", req.user.email);
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyComments = async (req, res) => {
  try {
    const perfumes = await Perfume.find({ "comments.author": req.user.id })
      .populate("brand", "brandName")
      .lean();

    const comments = perfumes
      .map((p) => {
        const myComment = p.comments.find(
          (c) => c.author.toString() === req.user.id
        );
        if (myComment) {
          return {
            perfumeName: p.perfumeName,
            brand: p.brand.brandName,
            rating: myComment.rating,
            content: myComment.content,
            createdAt: myComment.createdAt,
          };
        }
      })
      .filter(Boolean);

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

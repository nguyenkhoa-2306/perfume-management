const Perfume = require("../models/Perfume");
const Brand = require("../models/Brand");
const Member = require("../models/Member");

// PUBLIC ROUTES
exports.getAllPerfumes = async (req, res) => {
  try {
    const perfumes = await Perfume.find()
      .populate("brand", "brandName")
      .select("perfumeName uri price targetAudience brand")
      .lean();
    res.json(perfumes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPerfumeById = async (req, res) => {
  try {
    const perfume = await Perfume.findById(req.params.id)
      .populate("brand", "brandName")
      .populate("comments.author", "name") // ✅ POPULATE AUTHOR NAME
      .lean();
    if (!perfume) return res.status(404).json({ message: "Perfume not found" });
    res.json(perfume);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// SEARCH & FILTER (giữ nguyên)
exports.searchPerfumes = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === "") {
      return res.status(400).json({ message: "Search query is required" });
    }
    const perfumes = await Perfume.find({
      perfumeName: { $regex: q, $options: "i" },
    })
      .populate("brand", "brandName")
      .populate("comments.author", "name") // ✅ POPULATE AUTHOR NAME
      .lean();
    res.json(perfumes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.filterByBrand = async (req, res) => {
  try {
    const { brand } = req.query;
    if (!brand || brand.trim() === "") {
      return res.status(400).json({ message: "Brand name is required" });
    }
    const perfumes = await Perfume.find()
      .populate("brand", "brandName")
      .populate("comments.author", "name")
      .lean()
      .then((perfumes) =>
        perfumes.filter(
          (p) => p.brand.brandName.toLowerCase() === brand.toLowerCase()
        )
      );
    res.json(perfumes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADMIN CRUD (giữ nguyên)
exports.createPerfume = async (req, res) => {
  try {
    const perfume = new Perfume(req.body);
    await perfume.save();
    const populated = await Perfume.findById(perfume._id)
      .populate("brand", "brandName")
      .lean();
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePerfume = async (req, res) => {
  try {
    const perfume = await Perfume.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
      .populate("brand", "brandName")
      .lean();
    if (!perfume) return res.status(404).json({ message: "Perfume not found" });
    res.json(perfume);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deletePerfume = async (req, res) => {
  try {
    const perfume = await Perfume.findByIdAndDelete(req.params.id);
    if (!perfume) return res.status(404).json({ message: "Perfume not found" });
    res.json({ message: "Perfume deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ TASK 3: ADD COMMENT (EMBEDDED)
exports.addComment = async (req, res) => {
  try {
    const { perfumeId } = req.params;
    const { rating, content } = req.body;

    const perfume = await Perfume.findById(perfumeId);
    if (!perfume) return res.status(404).json({ message: "Perfume not found" });

    // ✅ CHECK: Member already commented?
    const existingComment = perfume.comments.find(
      (c) => c.author.toString() === req.user.id
    );
    if (existingComment) {
      return res
        .status(400)
        .json({ message: "You already commented this perfume" });
    }

    // ✅ ADD EMBEDDED COMMENT
    perfume.comments.push({
      rating,
      content,
      author: req.user.id,
    });
    await perfume.save();

    // ✅ RE-POPULATE
    const updatedPerfume = await Perfume.findById(perfumeId)
      .populate("brand", "brandName")
      .populate("comments.author", "name")
      .lean();

    res.status(201).json({
      message: "Comment added",
      perfume: updatedPerfume,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const Brand = require("../models/Brand");
const Perfume = require("../models/Perfume");

exports.getAllBrands = async (req, res) => {
  try {
    const brands = await Brand.find().lean();
    res.json(brands);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createBrand = async (req, res) => {
  try {
    const brand = new Brand(req.body);
    await brand.save();
    res.status(201).json(brand);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).lean();
    if (!brand) return res.status(404).json({ message: "Brand not found" });
    res.json(brand);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    const perfumeCount = await Perfume.countDocuments({ brand: id });

    if (perfumeCount > 0) {
      return res.status(400).json({
        message: `Cannot delete brand ${brand.brandName}! ${perfumeCount} perfume(s) associated with this brand. Delete perfumes first.`,
      });
    }

    await Brand.findByIdAndDelete(id);

    res.json({
      message: "Brand deleted successfully",
      deletedBrand: brand.brandName,
    });
  } catch (error) {
    console.error("Delete brand error:", error);
    res.status(500).json({ message: error.message });
  }
};

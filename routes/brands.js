const express = require("express");
const {
  getAllBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} = require("../controllers/brandController");
const auth = require("../middleware/auth");
const adminAuth = require('../middleware/authAdmin');
const router = express.Router();

// PUBLIC
router.get("/", getAllBrands);

// ADMIN - TASK 2
router.post("/", auth, adminAuth, createBrand);
router.put("/:id", auth, adminAuth, updateBrand);
router.delete("/:id", auth, adminAuth, deleteBrand);

module.exports = router;

const express = require("express");
const {
  getAllPerfumes,
  getPerfumeById,
  searchPerfumes,
  filterByBrand,
  createPerfume,
  updatePerfume,
  deletePerfume,
  addComment,
} = require("../controllers/perfumeController");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/authAdmin");
const router = express.Router();

// PUBLIC ROUTES - TASK 1
router.get("/", getAllPerfumes);
router.get("/search", searchPerfumes);
router.get("/filter", filterByBrand);
router.get("/:id", getPerfumeById);

// ADMIN ROUTES - TASK 2
router.post("/", auth, adminAuth, createPerfume);
router.put("/:id", auth, adminAuth, updatePerfume);
router.delete("/:id", auth, adminAuth, deletePerfume);

// MEMBER COMMENT - TASK 3
router.post("/:perfumeId/comment", auth, addComment);

module.exports = router;

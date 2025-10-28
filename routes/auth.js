const express = require("express");
const { register, login } = require("../controllers/authController");
const auth = require('../middleware/auth');
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", auth, (req, res) => {
  res.json({ message: "Logout successful" });
});

module.exports = router;

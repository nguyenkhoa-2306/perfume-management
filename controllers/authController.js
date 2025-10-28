const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Member = require("../models/Member");

exports.register = async (req, res) => {
  try {
    const { email, password, name, YOB, gender } = req.body;

    // Check existing
    const existing = await Member.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already exists" });

    const member = new Member({
      email,
      password,
      name,
      YOB: parseInt(YOB),
      gender: gender === "true" || gender === true,
      isAdmin: false,
    });
    await member.save();

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Server configuration error" });
    }

    const token = jwt.sign({ id: member._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.status(201).json({
      message: "Member registered",
      token,
      member: {
        id: member._id,
        email: member.email,
        name: member.name,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ FIX: QUERY FULL MEMBER INFO
    const member = await Member.findOne({ email }).select("+password");

    if (!member || !(await member.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Server configuration error" });
    }

    const token = jwt.sign({ id: member._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // ✅ FIX: USE member.name THAY VÌ name
    res.json({
      message: "Login successful",
      token,
      member: {
        id: member._id,
        email: member.email,
        name: member.name,
        isAdmin: member.isAdmin,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message });
  }
};

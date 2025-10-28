require("dotenv").config(); // ✅ ĐẦU TIÊN

const session = require("express-session");
const flash = require("connect-flash");
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/database");
const path = require("path");

const app = express();

// DEBUG
console.log("🔑 JWT_SECRET:", process.env.JWT_SECRET);

// ========== MIDDLEWARE (THỨ TỰ QUAN TRỌNG!) ==========
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ✅ QUAN TRỌNG CHO FORM

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

// Session
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

// Flash messages
app.use(flash());

// Database
connectDB();

// ========== ROUTES (CUỐI CÙNG) ==========
const authRoutes = require("./routes/auth");
const memberRoutes = require("./routes/members");
const perfumeRoutes = require("./routes/perfumes");
const brandRoutes = require("./routes/brands");
const viewRoutes = require("./routes/views");

app.use("/", viewRoutes); // ✅ VIEW ROUTES PHẢI CÓ
app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/perfumes", perfumeRoutes);
app.use("/api/brands", brandRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ message: "Perfume Management Backend is running" });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

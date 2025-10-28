require("dotenv").config(); // ✅ LOAD .env ĐẦU TIÊN

const session = require("express-session");
const flash = require("connect-flash");
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/database");
const authRoutes = require("./routes/auth");
const memberRoutes = require("./routes/members");
const perfumeRoutes = require("./routes/perfumes");
const brandRoutes = require("./routes/brands");
const viewRoutes = require("./routes/views");
const path = require("path");

const app = express();

// DEBUG: Kiểm tra JWT_SECRET
console.log("🔑 JWT_SECRET:", process.env.JWT_SECRET);

// Middleware
app.use(cors());
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);
app.use(flash());

// Database
connectDB();

// Routes

app.use("/", viewRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/perfumes", perfumeRoutes);
app.use("/api/brands", brandRoutes);
app.get("/health", (req, res) => {
  res.json({ message: "Perfume Management Backend is running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

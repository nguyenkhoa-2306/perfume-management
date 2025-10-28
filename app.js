require("dotenv").config();

const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const cors = require("cors");
const path = require("path");
const { connectDB } = require("./config/database");

const app = express();

// ========== CẤU HÌNH CƠ BẢN ==========
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Session + Flash
app.use(
  session({
    secret: process.env.JWT_SECRET || "secretkey",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
  })
);
app.use(flash());

// Database
connectDB();

// ========== ROUTES ==========
const authRoutes = require("./routes/auth");
const memberRoutes = require("./routes/members");
const perfumeRoutes = require("./routes/perfumes");
const brandRoutes = require("./routes/brands");
const viewRoutes = require("./routes/views");

app.use("/", viewRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/perfumes", perfumeRoutes);
app.use("/api/brands", brandRoutes);

// Health check
app.get("/health", (req, res) => res.json({ status: "OK" }));

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

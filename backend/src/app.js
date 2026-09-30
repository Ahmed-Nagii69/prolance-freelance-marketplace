const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const proposalRoutes = require("./routes/proposalRoutes");
const contractRoutes = require("./routes/contractRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const disputeRoutes = require("./routes/disputeRoutes");
const savedFreelancerRoutes = require("./routes/savedFreelancerRoutes");
const walletRoutes = require("./routes/walletRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const platformRoutes = require("./routes/platformRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");
const sendResponse = require("./utils/response");
const mongoose = require("mongoose");

const app = express();

const corsOptions = process.env.CORS_ORIGINS
  ? { origin: process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()) }
  : undefined;

app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));

const healthCheck = (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  return sendResponse(
    res,
    databaseReady ? 200 : 503,
    databaseReady ? "ProLance API is ready" : "ProLance API is not ready",
    { database: databaseReady ? "connected" : "disconnected" },
    databaseReady ? null : { code: "DATABASE_UNAVAILABLE" },
  );
};

app.get("/", healthCheck);
app.get("/health", healthCheck);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/saved-freelancers", savedFreelancerRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/platform", platformRoutes);

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use((req, res) => {
  return sendResponse(res, 404, "Route not found", null, { code: "NOT_FOUND" });
});

app.use(errorMiddleware);

module.exports = app;

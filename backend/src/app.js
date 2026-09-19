const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const proposalRoutes = require("./routes/proposalRoutes");
const contractRoutes = require("./routes/contractRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const messageRoutes = require("./routes/messageRoutes");
const skillRoutes = require("./routes/skillRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
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
app.use("/api/skills", skillRoutes);
app.use("/api/services", serviceRoutes);

app.use((req, res) => {
  return sendResponse(res, 404, "Route not found", null, { code: "NOT_FOUND" });
});

app.use(errorMiddleware);

module.exports = app;

require("dotenv").config();

const connectDB = require("./src/config/db");
const app = require("./src/app");

const requiredEnvironment = ["MONGODB_URI", "JWT_SECRET"];
const missingEnvironment = requiredEnvironment.filter(
  (name) => !process.env[name] || process.env[name].includes("your_"),
);

if (missingEnvironment.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvironment.join(", ")}`,
  );
}

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  });

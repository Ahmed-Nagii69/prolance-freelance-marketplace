require("dotenv").config();
const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const models = [
  require("./src/models/User"),
  require("./src/models/FreelancerProfile"),
  require("./src/models/Project"),
  require("./src/models/Proposal"),
  require("./src/models/Contract"),
  require("./src/models/Message"),
  require("./src/models/Review"),
  require("./src/models/Transaction"),
  require("./src/models/Notification"),
  require("./src/models/Dispute"),
  require("./src/models/PortfolioItem"),
  require("./src/models/SavedFreelancer"),
  require("./src/models/PlatformSetting"),
];

const User = require("./src/models/User");
const PlatformSetting = require("./src/models/PlatformSetting");

// Nothing here is a default credential: a random admin password is generated per
// run and printed once. Set ADMIN_PASSWORD to choose your own.
const ADMIN_NAME = process.env.ADMIN_NAME || "Site Admin";
const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || "admin@prolance.dev"
).toLowerCase();
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || `Admin-${crypto.randomBytes(9).toString("base64url")}!`;

// Dropping a live database is irreversible, so the run only happens when the
// caller has explicitly opted in. The target is printed either way.
const isConfirmed =
  process.argv.includes("--yes") || process.env.RESET_DB_CONFIRM === "1";

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const { host, name } = mongoose.connection;

  const existing = (await db.listCollections().toArray()).map(
    (collection) => collection.name,
  );

  console.log(`Target cluster : ${host}`);
  console.log(`Target database: ${name}`);
  console.log(`Collections    : ${existing.length ? existing.join(", ") : "(none)"}`);
  console.log("Action         : DROP every collection, then recreate the admin account only.");

  if (!isConfirmed) {
    console.log("");
    console.log("Refusing to run without confirmation. Nothing was changed.");
    console.log("Re-run with:  node reset-db.js --yes");
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log("");
  console.log("Dropping collections ...");
  for (const name of existing) {
    await db.collection(name).drop().catch(() => {
      // A collection can vanish between the listing and the drop when the app is
      // running against the same database. Losing the race is fine.
    });
  }

  // Mongoose builds indexes once per model, which already happened before the
  // drop. Recreating them leaves every collection present, empty and indexed, so
  // the server starts against a working schema with no data in it.
  console.log("Recreating indexes ...");
  for (const model of models) {
    await model.createIndexes();
  }

  const admin = await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: await bcrypt.hash(ADMIN_PASSWORD, 10),
    role: "ADMIN",
    bio: "Platform administrator.",
    profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(
      ADMIN_NAME,
    )}&background=0d6efd&color=fff`,
  });

  // The fee has a code-level default, but seeding the row means the admin
  // settings page opens on a real value instead of an empty form.
  await PlatformSetting.create({ platformFeePercent: 10 });

  const counts = {};
  for (const model of models) {
    counts[model.collection.collectionName] = await model.estimatedDocumentCount();
  }

  console.log("");
  console.log("Reset complete.");
  console.log(
    JSON.stringify(
      {
        admin: { _id: admin._id, email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        documentCounts: counts,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Reset failed:", err.message);
  process.exit(1);
});

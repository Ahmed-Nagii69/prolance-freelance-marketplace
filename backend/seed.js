require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./src/models/User");
const FreelancerProfile = require("./src/models/FreelancerProfile");
const Project = require("./src/models/Project");
const Proposal = require("./src/models/Proposal");
const Contract = require("./src/models/Contract");
const Message = require("./src/models/Message");
const Review = require("./src/models/Review");
const Transaction = require("./src/models/Transaction");
const Notification = require("./src/models/Notification");

const DAY = 24 * 60 * 60 * 1000;
const future = (days) => new Date(Date.now() + days * DAY);
const hash = (p) => bcrypt.hash(p, 10);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const collections = [
    User,
    FreelancerProfile,
    Project,
    Proposal,
    Contract,
    Message,
    Review,
    Transaction,
    Notification,
  ];

  console.log("Wiping collections ...");
  for (const model of collections) {
    await model.deleteMany({});
  }

  console.log("Seeding users ...");
  const admin = await User.create({
    name: "Site Admin",
    email: "admin@prolance.dev",
    password: await hash("AdminPass123!"),
    role: "ADMIN",
    bio: "Platform administrator.",
  });

  const clientAmara = await User.create({
    name: "Amara Okafor",
    email: "client@prolance.dev",
    password: await hash("Password123!"),
    role: "CLIENT",
    bio: "Product lead at a fast-growing fintech.",
    balance: 14100,
  });
  const clientArjun = await User.create({
    name: "Arjun Mehta",
    email: "arjun@prolance.dev",
    password: await hash("Password123!"),
    role: "CLIENT",
    bio: "Founder of a speciality coffee brand.",
    balance: 6800,
  });

  const freDana = await User.create({
    name: "Dana Cole",
    email: "freelancer@prolance.dev",
    password: await hash("Password123!"),
    role: "FREELANCER",
    bio: "Full-stack engineer building reliable web products.",
    skills: ["typescript", "react", "node"],
    balance: 5900,
  });
  const freNoor = await User.create({
    name: "Noor Haddad",
    email: "noor@prolance.dev",
    password: await hash("Password123!"),
    role: "FREELANCER",
    bio: "Brand and product designer.",
  });
  const freSam = await User.create({
    name: "Sam Fields",
    email: "sam@prolance.dev",
    password: await hash("Password123!"),
    role: "FREELANCER",
    bio: "Writer and SEO strategist.",
    skills: ["copywriting", "seo"],
  });

  await FreelancerProfile.create([
    {
      user: freDana._id,
      title: "Full-stack Engineer",
      bio: "Node + TypeScript + React. I ship maintainable products.",
      hourlyRate: 80,
      skills: ["typescript", "react", "node"],
    },
    {
      user: freNoor._id,
      title: "Brand Designer",
      bio: "Identities, systems and product design.",
      hourlyRate: 65,
      skills: ["branding", "ui design", "figma"],
    },
    {
      user: freSam._id,
      title: "Content & SEO Strategist",
      bio: "Content that converts, from brief to published.",
      hourlyRate: 45,
      skills: ["copywriting", "seo"],
    },
  ]);

  console.log("Seeding projects ...");
  const pStorefront = await Project.create({
    title: "E-commerce storefront rebuild",
    description:
      "Rebuild our storefront for speed and conversion. Existing Figma kit and API live, need a clean implementation with SSR for SEO.",
    budget: 8000,
    deadline: future(30),
    skills: ["typescript", "react", "sql"],
    status: "OPEN",
    client: clientAmara._id,
  });
  const pDashboard = await Project.create({
    title: "Crypto portfolio dashboard",
    description:
      "A real-time portfolio dashboard with price alerts, history charts and exportable reports. Backend endpoints documented.",
    budget: 12000,
    deadline: future(45),
    skills: ["node", "typescript", "react"],
    status: "OPEN",
    client: clientAmara._id,
  });
  const pBrand = await Project.create({
    title: "Brand identity for coffee chain",
    description:
      "Full identity refresh: logo, color, type, packaging guidelines and a launch one-pager for a 12-outlet chain.",
    budget: 3500,
    deadline: future(21),
    skills: ["branding", "ui design", "figma"],
    status: "IN_PROGRESS",
    client: clientArjun._id,
  });
  const pSeo = await Project.create({
    title: "Launch SEO content package",
    description:
      "Twelve long-form articles optimised for our target keywords plus a site-wide meta audit.",
    budget: 1800,
    deadline: future(14),
    skills: ["copywriting", "seo"],
    status: "OPEN",
    client: clientArjun._id,
  });
  const pTracker = await Project.create({
    title: "Mobile price tracker app",
    description:
      "Cross-platform app that watches prices on our catalogue and notifies on drops. Needs auth, background sync, tidy UI.",
    budget: 6000,
    deadline: future(40),
    skills: ["javascript", "node"],
    status: "COMPLETED",
    client: clientAmara._id,
  });

  console.log("Seeding proposals ...");
  const propDanaStore = await Proposal.create({
    project: pStorefront._id,
    freelancer: freDana._id,
    coverLetter:
      "I rebuilt two storefronts in the last year with SSR and sub-second loads. Your Figma kit is a match for my stack.",
    price: 7800,
    deliveryTime: 25,
    status: "PENDING",
  });
  const propDanaDash = await Proposal.create({
    project: pDashboard._id,
    freelancer: freDana._id,
    coverLetter:
      "Real-time dashboards are my speciality. I can have a live skeleton in two weeks and full charts by week four.",
    price: 11500,
    deliveryTime: 40,
    status: "PENDING",
  });
  const propNoorBrand = await Proposal.create({
    project: pBrand._id,
    freelancer: freNoor._id,
    coverLetter:
      "I've designed identities for three hospitality brands. I'll bring a flexible system, not just a logo.",
    price: 3200,
    deliveryTime: 15,
    status: "ACCEPTED",
  });
  const propSamSeo = await Proposal.create({
    project: pSeo._id,
    freelancer: freSam._id,
    coverLetter:
      "Twelve articles, a keyword plan and an audit — with a documented content calendar so you can repeat the process.",
    price: 1650,
    deliveryTime: 10,
    status: "PENDING",
  });
  const propDanaTracker = await Proposal.create({
    project: pTracker._id,
    freelancer: freDana._id,
    coverLetter:
      "Built the sync engine and shipped the app in thirty days. Happy to discuss the battery optimisation approach.",
    price: 5900,
    deliveryTime: 32,
    status: "ACCEPTED",
  });

  console.log("Seeding contracts ...");
  const contractBrand = await Contract.create({
    project: pBrand._id,
    proposal: propNoorBrand._id,
    client: clientArjun._id,
    freelancer: freNoor._id,
    agreedPrice: propNoorBrand.price,
    startDate: future(-5),
    deadline: future(10),
    status: "ACTIVE",
    heldAmount: propNoorBrand.price,
  });
  const contractTracker = await Contract.create({
    project: pTracker._id,
    proposal: propDanaTracker._id,
    client: clientAmara._id,
    freelancer: freDana._id,
    agreedPrice: propDanaTracker.price,
    startDate: future(-40),
    deadline: future(-8),
    status: "COMPLETED",
    heldAmount: propDanaTracker.price,
    paymentReleased: true,
  });

  console.log("Seeding messages ...");
  await Message.create([
    {
      sender: clientAmara._id,
      receiver: freDana._id,
      project: pStorefront._id,
      content: "Hi Dana — thanks for the proposal. Quick question on the SSR setup.",
      isRead: true,
    },
    {
      sender: freDana._id,
      receiver: clientAmara._id,
      project: pStorefront._id,
      content: "Happy to! We'd use Angular Universal — same pattern as your previous site.",
      isRead: true,
    },
    {
      sender: clientArjun._id,
      receiver: freNoor._id,
      project: pBrand._id,
      content: "The moodboard direction is great. Could we see the type options by Friday?",
      isRead: false,
    },
  ]);

  console.log("Seeding reviews ...");
  await Review.create([
    {
      contract: contractTracker._id,
      reviewer: clientAmara._id,
      reviewee: freDana._id,
      rating: 5,
      comment: "Delivered ahead of schedule and the battery work paid off. Would hire again.",
    },
    {
      contract: contractTracker._id,
      reviewer: freDana._id,
      reviewee: clientAmara._id,
      rating: 4,
      comment: "Clear requirements and responsive throughout.",
    },
  ]);

  console.log("Seeding transactions ...");
  await Transaction.create([
    {
      user: freDana._id,
      type: "CREDIT",
      amount: propDanaTracker.price,
      balanceAfter: 5900,
      contract: contractTracker._id,
      project: pTracker._id,
      description: "Payment received for completed contract",
    },
    {
      user: clientAmara._id,
      type: "DEBIT",
      amount: propDanaTracker.price,
      balanceAfter: 14100,
      contract: contractTracker._id,
      project: pTracker._id,
      description: "Contract payment",
    },
    {
      user: clientArjun._id,
      type: "DEBIT",
      amount: propNoorBrand.price,
      balanceAfter: 6800,
      contract: contractBrand._id,
      project: pBrand._id,
      description: "Funds held for contract with Noor Haddad",
    },
  ]);

  console.log("Seeding notifications ...");
  await Notification.create([
    {
      user: clientAmara._id,
      actor: freDana._id,
      type: "PROPOSAL",
      message: `Dana Cole submitted a proposal for "${pStorefront.title}"`,
      link: `/projects/${pStorefront._id}/proposals`,
    },
    {
      user: freDana._id,
      actor: clientAmara._id,
      type: "MESSAGE",
      message: `Amara Okafor sent you a message about "${pStorefront.title}"`,
      link: `/messages/project/${pStorefront._id}`,
    },
    {
      user: freNoor._id,
      actor: clientArjun._id,
      type: "PROPOSAL_ACCEPTED",
      message: `Your proposal for "${pBrand.title}" was accepted`,
      link: `/contracts/${contractBrand._id}`,
    },
    {
      user: clientArjun._id,
      actor: freNoor._id,
      type: "WORK_SUBMITTED",
      message: `Noor Haddad submitted work for "${pBrand.title}". Review it to release the payment.`,
      link: `/contracts/${contractBrand._id}`,
    },
  ]);

  console.log("Done.");
  console.log(
    JSON.stringify(
      {
        admin: { email: "admin@prolance.dev", password: "AdminPass123!" },
        client: { email: "client@prolance.dev", password: "Password123!" },
        freelancer: { email: "freelancer@prolance.dev", password: "Password123!" },
        projects: 5,
        proposals: 5,
        contracts: { active: 1, completed: 1 },
      },
      null,
      2,
    ),
  );
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
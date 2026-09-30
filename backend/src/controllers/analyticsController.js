const User = require("../models/User");
const Project = require("../models/Project");
const Proposal = require("../models/Proposal");
const Contract = require("../models/Contract");
const Review = require("../models/Review");
const Transaction = require("../models/Transaction");
const FreelancerProfile = require("../models/FreelancerProfile");
const PortfolioItem = require("../models/PortfolioItem");
const PlatformSetting = require("../models/PlatformSetting");
const sendResponse = require("../utils/response");

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const feeAmountExpression = (defaultPercent) => ({
  $cond: [
    { $gt: [{ $ifNull: ["$platformFeeAmount", 0] }, 0] },
    { $ifNull: ["$platformFeeAmount", 0] },
    {
      $multiply: [
        { $ifNull: ["$agreedPrice", 0] },
        {
          $divide: [
            {
              $cond: [
                { $gt: [{ $ifNull: ["$platformFeePercent", 0] }, 0] },
                "$platformFeePercent",
                defaultPercent,
              ],
            },
            100,
          ],
        },
      ],
    },
  ],
});

const round2 = (value) => Math.round(num(value) * 100) / 100;

const countBy = (rows) => {
  const map = {};
  rows.forEach((row) => {
    map[row._id] = num(row.count);
  });
  return map;
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Last `monthsBack` calendar slots, oldest first, with a ready label. */
const monthSlots = (monthsBack) => {
  const now = new Date();
  const slots = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    slots.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
    });
  }
  return slots;
};

const monthsBackStart = (monthsBack) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
};

/** Turns a `$year`/`$month` grouped aggregate into a dense monthly series. */
const buildMonthlySeries = (rows, monthsBack, valueKey, transform = round2) => {
  const found = {};
  rows.forEach((row) => {
    found[`${row._id.year}-${row._id.month}`] = row.total;
  });

  return monthSlots(monthsBack).map((slot) => ({
    label: slot.label,
    [valueKey]: transform(found[`${slot.year}-${slot.month}`]),
  }));
};

const distribution = (map, labels) =>
  labels.map(({ label, key }) => ({ label, value: num(map[key]) }));

/** Amount a freelancer actually receives once the platform fee is removed. */
const freelancerNetExpression = {
  $cond: [
    { $gt: [{ $ifNull: ["$freelancerNetAmount", 0] }, 0] },
    "$freelancerNetAmount",
    "$agreedPrice",
  ],
};

const sortActivity = (entries) =>
  entries
    .filter((entry) => entry && entry.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

const getAnalytics = async (req, res, next) => {
  try {
    let platformSetting = await PlatformSetting.findOne().sort({ createdAt: 1 }).lean();
    if (!platformSetting) {
      platformSetting = await PlatformSetting.create({ platformFeePercent: 10 });
      platformSetting = platformSetting.toObject();
    }

    const [
      totalUsers,
      usersByRole,
      totalProjects,
      projectsByStatus,
      totalProposals,
      totalContracts,
      activeContracts,
      completedContracts,
      avgRatingResult,
      platformRevenueResult,
      monthlyProjects,
      monthlyFees,
      recentProjects,
      recentContracts,
    ] = await Promise.all([
      User.countDocuments(),
      User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ]),
      Project.countDocuments(),
      Project.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Proposal.countDocuments(),
      Contract.countDocuments(),
      Contract.countDocuments({ status: { $in: ["ACTIVE", "WORK_SUBMITTED"] } }),
      Contract.countDocuments({ status: "COMPLETED" }),
      Review.aggregate([
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
      Contract.aggregate([
        { $match: { status: "COMPLETED", paymentReleased: true } },
        {
          $group: {
            _id: null,
            total: { $sum: feeAmountExpression(platformSetting.platformFeePercent) },
          },
        },
      ]),
      getMonthlyProjects(),
      getMonthlyFees(platformSetting.platformFeePercent),
      Project.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title status minBudget maxBudget createdAt client")
        .populate("client", "name")
        .lean(),
      Contract.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("agreedPrice status createdAt client freelancer project")
        .populate("client", "name")
        .populate("freelancer", "name")
        .populate("project", "title")
        .lean(),
    ]);

    const roleMap = {};
    usersByRole.forEach((r) => (roleMap[r._id] = r.count));

    const statusMap = {};
    projectsByStatus.forEach((s) => (statusMap[s._id] = s.count));

    const roleDistribution = [
      { label: "Clients", value: num(roleMap.CLIENT) },
      { label: "Freelancers", value: num(roleMap.FREELANCER) },
    ];

    const statusDistribution = [
      { label: "Completed", value: num(statusMap.COMPLETED) },
      { label: "Open", value: num(statusMap.OPEN) },
      { label: "In Progress", value: num(statusMap.IN_PROGRESS) },
      { label: "Under dispute", value: num(statusMap.DISPUTED) },
      { label: "Cancelled", value: num(statusMap.CANCELLED) },
    ];

    const platformFeePercent = num(platformSetting.platformFeePercent, 10);
    const platformRevenue = num(platformRevenueResult?.[0]?.total);
    return sendResponse(res, 200, "Analytics fetched successfully", {
      kpis: {
        totalUsers: num(totalUsers),
        clients: num(roleMap.CLIENT),
        freelancers: num(roleMap.FREELANCER),
        totalProjects: num(totalProjects),
        openProjects: num(statusMap.OPEN),
        activeProjects: num(statusMap.IN_PROGRESS),
        completedProjects: num(statusMap.COMPLETED),
        cancelledProjects: num(statusMap.CANCELLED),
        totalProposals: num(totalProposals),
        totalContracts: num(totalContracts),
        activeContracts: num(activeContracts),
        completedContracts: num(completedContracts),
        platformFeePercent,
        platformRevenue,
        avgRating: avgRatingResult?.[0]
          ? Math.round(num(avgRatingResult[0].avg) * 10) / 10
          : 0,
        totalReviews: num(avgRatingResult?.[0]?.count),
      },
      roleDistribution,
      statusDistribution,
      monthlyProjects,
      monthlyFees,
      recentActivity: {
        projects: recentProjects,
        contracts: recentContracts,
      },
    });
  } catch (error) {
    return next(error);
  }
};

async function getMonthlyProjects() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const monthly = await Project.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const result = [];
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const found = monthly.find(
      (m) => m._id.year === year && m._id.month === month,
    );
    result.push({
      label: `${monthNames[month - 1]} ${year}`,
      count: found ? num(found.count) : 0,
    });
  }

  return result;
}

async function getMonthlyFees(defaultPercent) {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const monthly = await Contract.aggregate([
    { $match: { status: "COMPLETED", paymentReleased: true, createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        total: { $sum: feeAmountExpression(defaultPercent) },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const result = [];
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const found = monthly.find(
      (m) => m._id.year === year && m._id.month === month,
    );
    result.push({
      label: `${monthNames[month - 1]} ${year}`,
      total: found ? Math.round(num(found.total) * 100) / 100 : 0,
    });
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* Personal analytics (freelancer)                                     */
/* ------------------------------------------------------------------ */

const getFreelancerAnalytics = async (req, res, next) => {
  try {
    const freelancerId = req.user._id;

    const [
      proposalRows,
      contractRows,
      earningsRow,
      pendingEarningsRow,
      reviewRow,
      profile,
      portfolioItems,
      recentProposals,
      recentContracts,
      recentPayments,
      recentReviews,
      monthlyEarningsRows,
    ] = await Promise.all([
      Proposal.aggregate([
        { $match: { freelancer: freelancerId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Contract.aggregate([
        { $match: { freelancer: freelancerId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            user: freelancerId,
            type: "CREDIT",
            contract: { $ne: null },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Contract.aggregate([
        {
          $match: {
            freelancer: freelancerId,
            paymentReleased: false,
            status: { $in: ["ACTIVE", "WORK_SUBMITTED"] },
          },
        },
        { $group: { _id: null, total: { $sum: freelancerNetExpression } } },
      ]),
      Review.aggregate([
        { $match: { reviewee: freelancerId } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
      FreelancerProfile.findOne({ user: freelancerId }).lean(),
      PortfolioItem.countDocuments({ freelancer: freelancerId }),
      Proposal.find({ freelancer: freelancerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("project status price createdAt")
        .populate("project", "title")
        .lean(),
      Contract.find({ freelancer: freelancerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("project status agreedPrice paymentReleased createdAt")
        .populate("project", "title")
        .lean(),
      Transaction.find({
        user: freelancerId,
        type: "CREDIT",
        contract: { $ne: null },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("amount contract project createdAt")
        .populate("project", "title")
        .lean(),
      Review.find({ reviewee: freelancerId })
        .sort({ createdAt: -1 })
        .limit(3)
        .select("rating comment reviewer createdAt")
        .populate("reviewer", "name")
        .lean(),
      Transaction.aggregate([
        {
          $match: {
            user: freelancerId,
            type: "CREDIT",
            contract: { $ne: null },
            createdAt: { $gte: monthsBackStart(6) },
          },
        },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    const proposalMap = countBy(proposalRows);
    const contractMap = countBy(contractRows);

    const totalProposals = num(proposalMap.PENDING) + num(proposalMap.ACCEPTED) + num(proposalMap.REJECTED);
    const pendingProposals = num(proposalMap.PENDING);
    const acceptedProposals = num(proposalMap.ACCEPTED);
    const rejectedProposals = num(proposalMap.REJECTED);

    const totalContracts =
      num(contractMap.ACTIVE) +
      num(contractMap.WORK_SUBMITTED) +
      num(contractMap.DISPUTED) +
      num(contractMap.COMPLETED) +
      num(contractMap.CANCELLED);

    const profileSignals = [
      Boolean(req.user.profileImage),
      Boolean(profile?.title),
      Boolean(profile?.bio || req.user.bio),
      num(profile?.hourlyRate) > 0,
      (profile?.skills?.length ?? req.user.skills?.length ?? 0) > 0,
      num(portfolioItems) > 0,
    ];
    const completedSignals = profileSignals.filter(Boolean).length;

    const activity = sortActivity([
      ...recentProposals.map((proposal) => {
        const projectTitle = proposal.project?.title ?? "a project";
        return {
          type:
            proposal.status === "PENDING"
              ? "PROPOSAL_SUBMITTED"
              : `PROPOSAL_${proposal.status}`,
          title:
            proposal.status === "PENDING"
              ? `Proposal submitted for “${projectTitle}”`
              : `Proposal ${proposal.status.toLowerCase()} for “${projectTitle}”`,
          amount: num(proposal.price),
          status: proposal.status,
          at: proposal.createdAt,
          link: "/proposals/my",
        };
      }),
      ...recentContracts.map((contract) => {
        const projectTitle = contract.project?.title ?? "a project";
        const isCompleted = contract.status === "COMPLETED";
        return {
          type: isCompleted ? "CONTRACT_COMPLETED" : "CONTRACT_STARTED",
          title: isCompleted
            ? `Contract completed for “${projectTitle}”`
            : `Contract started for “${projectTitle}”`,
          amount: num(contract.agreedPrice),
          status: contract.status,
          at: contract.createdAt,
          link: `/contracts/${contract._id}`,
        };
      }),
      ...recentPayments.map((payment) => ({
        type: "PAYMENT_RECEIVED",
        title: `Payment received for “${payment.project?.title ?? "a contract"}”`,
        amount: num(payment.amount),
        status: "COMPLETED",
        at: payment.createdAt,
        link: payment.contract ? `/contracts/${payment.contract}` : "/profile",
      })),
      ...recentReviews.map((review) => ({
        type: "REVIEW_RECEIVED",
        title: `${review.rating}-star review from ${review.reviewer?.name ?? "a client"}`,
        amount: null,
        status: null,
        at: review.createdAt,
        link: "/profile/freelancer",
      })),
    ]);

    return sendResponse(res, 200, "Freelancer analytics fetched successfully", {
      kpis: {
        totalProposals,
        pendingProposals,
        acceptedProposals,
        rejectedProposals,
        acceptanceRate:
          totalProposals > 0
            ? Math.round((acceptedProposals / totalProposals) * 100)
            : null,
        totalContracts,
        activeContracts: num(contractMap.ACTIVE) + num(contractMap.WORK_SUBMITTED),
        disputedContracts: num(contractMap.DISPUTED),
        completedContracts: num(contractMap.COMPLETED),
        cancelledContracts: num(contractMap.CANCELLED),
        totalEarnings: round2(earningsRow?.[0]?.total),
        pendingEarnings: round2(pendingEarningsRow?.[0]?.total),
        avgRating: reviewRow?.[0] ? Math.round(num(reviewRow[0].avg) * 10) / 10 : 0,
        totalReviews: num(reviewRow?.[0]?.count),
        portfolioItems: num(portfolioItems),
        profileCompletion: Math.round(
          (completedSignals / profileSignals.length) * 100,
        ),
      },
      proposalStatus: distribution(proposalMap, [
        { label: "Pending", key: "PENDING" },
        { label: "Accepted", key: "ACCEPTED" },
        { label: "Rejected", key: "REJECTED" },
      ]),
      contractStatus: distribution(contractMap, [
        { label: "Active", key: "ACTIVE" },
        { label: "Work submitted", key: "WORK_SUBMITTED" },
        { label: "Under dispute", key: "DISPUTED" },
        { label: "Completed", key: "COMPLETED" },
        { label: "Cancelled", key: "CANCELLED" },
      ]),
      monthlyEarnings: buildMonthlySeries(monthlyEarningsRows, 6, "total"),
      recentActivity: activity,
    });
  } catch (error) {
    return next(error);
  }
};

/* ------------------------------------------------------------------ */
/* Personal analytics (client)                                         */
/* ------------------------------------------------------------------ */

const getClientAnalytics = async (req, res, next) => {
  try {
    const clientId = req.user._id;
    const projects = await Project.find({ client: clientId }).select(
      "_id title status createdAt",
    );
    const projectIds = projects.map((project) => project._id);
    const projectMap = {};
    projects.forEach((project) => {
      projectMap[project.status] = num(projectMap[project.status]) + 1;
    });

    const [
      proposalRows,
      contractRows,
      spendingRow,
      recentProposals,
      recentContracts,
      recentPayments,
      recentReviews,
      monthlySpendingRows,
    ] = await Promise.all([
      Proposal.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Contract.aggregate([
        { $match: { client: clientId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        {
          $match: { user: clientId, type: "DEBIT", contract: { $ne: null } },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Proposal.find({ project: { $in: projectIds } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("project freelancer status price createdAt")
        .populate("project", "title")
        .populate("freelancer", "name")
        .lean(),
      Contract.find({ client: clientId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("project status agreedPrice createdAt")
        .populate("project", "title")
        .lean(),
      Transaction.find({
        user: clientId,
        type: "DEBIT",
        contract: { $ne: null },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("amount contract project createdAt")
        .populate("project", "title")
        .lean(),
      Review.find({ reviewer: clientId })
        .sort({ createdAt: -1 })
        .limit(3)
        .select("rating comment reviewee createdAt")
        .populate("reviewee", "name")
        .lean(),
      Transaction.aggregate([
        {
          $match: {
            user: clientId,
            type: "DEBIT",
            contract: { $ne: null },
            createdAt: { $gte: monthsBackStart(6) },
          },
        },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    const proposalMap = countBy(proposalRows);
    const contractMap = countBy(contractRows);

    const totalProposals =
      num(proposalMap.PENDING) + num(proposalMap.ACCEPTED) + num(proposalMap.REJECTED);
    const acceptedProposals = num(proposalMap.ACCEPTED);
    const openProjects = num(projectMap.OPEN);
    const inProgressProjects = num(projectMap.IN_PROGRESS);

    const activity = sortActivity([
      ...projects
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map((project) => ({
          type: "PROJECT_CREATED",
          title: `Project created: “${project.title}”`,
          amount: null,
          status: project.status,
          at: project.createdAt,
          link: `/projects/${project._id}`,
        })),
      ...recentProposals.map((proposal) => {
        const projectTitle = proposal.project?.title ?? "a project";
        const freelancerName = proposal.freelancer?.name ?? "A freelancer";
        const isPending = proposal.status === "PENDING";
        return {
          type: isPending
            ? "PROPOSAL_RECEIVED"
            : `PROPOSAL_${proposal.status}`,
          title: isPending
            ? `Proposal received from ${freelancerName} for “${projectTitle}”`
            : `Proposal ${proposal.status.toLowerCase()} from ${freelancerName}`,
          amount: num(proposal.price),
          status: proposal.status,
          at: proposal.createdAt,
          link: proposal.project
            ? `/projects/${proposal.project._id}/proposals`
            : "/projects/my",
        };
      }),
      ...recentContracts.map((contract) => {
        const projectTitle = contract.project?.title ?? "a project";
        const isCompleted = contract.status === "COMPLETED";
        return {
          type: isCompleted ? "CONTRACT_COMPLETED" : "CONTRACT_STARTED",
          title: isCompleted
            ? `Contract completed for “${projectTitle}”`
            : `Contract started for “${projectTitle}”`,
          amount: num(contract.agreedPrice),
          status: contract.status,
          at: contract.createdAt,
          link: `/contracts/${contract._id}`,
        };
      }),
      ...recentPayments.map((payment) => ({
        type: "PAYMENT_MADE",
        title: `Payment made for “${payment.project?.title ?? "a contract"}”`,
        amount: num(payment.amount),
        status: "COMPLETED",
        at: payment.createdAt,
        link: payment.contract ? `/contracts/${payment.contract}` : "/projects/my",
      })),
      ...recentReviews.map((review) => ({
        type: "REVIEW_SUBMITTED",
        title: `You reviewed ${review.reviewee?.name ?? "a freelancer"}`,
        amount: null,
        status: null,
        at: review.createdAt,
        link: "/contracts",
      })),
    ]);

    return sendResponse(res, 200, "Client analytics fetched successfully", {
      kpis: {
        totalProjects: projects.length,
        openProjects,
        inProgressProjects,
        activeProjects: openProjects + inProgressProjects,
        completedProjects: num(projectMap.COMPLETED),
        disputedProjects: num(projectMap.DISPUTED),
        cancelledProjects: num(projectMap.CANCELLED),
        totalProposals,
        pendingProposals: num(proposalMap.PENDING),
        acceptedProposals,
        rejectedProposals: num(proposalMap.REJECTED),
        selectionRate:
          totalProposals > 0
            ? Math.round((acceptedProposals / totalProposals) * 100)
            : null,
        totalContracts:
          num(contractMap.ACTIVE) +
          num(contractMap.WORK_SUBMITTED) +
          num(contractMap.DISPUTED) +
          num(contractMap.COMPLETED) +
          num(contractMap.CANCELLED),
        activeContracts: num(contractMap.ACTIVE) + num(contractMap.WORK_SUBMITTED),
        disputedContracts: num(contractMap.DISPUTED),
        completedContracts: num(contractMap.COMPLETED),
        totalSpent: round2(spendingRow?.[0]?.total),
      },
      projectStatus: distribution(projectMap, [
        { label: "Open", key: "OPEN" },
        { label: "In progress", key: "IN_PROGRESS" },
        { label: "Under dispute", key: "DISPUTED" },
        { label: "Completed", key: "COMPLETED" },
        { label: "Cancelled", key: "CANCELLED" },
      ]),
      proposalStatus: distribution(proposalMap, [
        { label: "Pending", key: "PENDING" },
        { label: "Accepted", key: "ACCEPTED" },
        { label: "Rejected", key: "REJECTED" },
      ]),
      monthlySpending: buildMonthlySeries(monthlySpendingRows, 6, "total"),
      recentActivity: activity,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAnalytics,
  getFreelancerAnalytics,
  getClientAnalytics,
};

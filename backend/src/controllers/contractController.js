const Contract = require("../models/Contract");
const Project = require("../models/Project");
const sendResponse = require("../utils/response");

const getContracts = async (req, res, next) => {
  try {
    const filter = {
      $or: [{ client: req.user._id }, { freelancer: req.user._id }],
    };
    const parsedPage = req.query.page === undefined ? 1 : Number(req.query.page);
    const parsedLimit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return sendResponse(res, 400, "Invalid contract pagination", null, { code: "VALIDATION_ERROR" });
    }
    const total = await Contract.countDocuments(filter);
    const contracts = await Contract.find(filter)
      .populate("project", "title status budget")
      .populate("proposal", "coverLetter price deliveryTime")
      .populate("client", "name email")
      .populate("freelancer", "name email")
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    return sendResponse(res, 200, "Contracts fetched successfully", {
      contracts,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
        hasNextPage: parsedPage * parsedLimit < total,
        hasPreviousPage: parsedPage > 1,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getContractById = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate("project", "title status budget client")
      .populate("proposal", "coverLetter price deliveryTime")
      .populate("client", "name email")
      .populate("freelancer", "name email");

    if (!contract) {
      return sendResponse(res, 404, "Contract not found", null, {
        code: "CONTRACT_NOT_FOUND",
      });
    }

    if (
      contract.client._id.toString() !== req.user._id.toString() &&
      contract.freelancer._id.toString() !== req.user._id.toString()
    ) {
      return sendResponse(
        res,
        403,
        "You are not allowed to view this contract",
        null,
        { code: "FORBIDDEN" },
      );
    }

    return sendResponse(res, 200, "Contract fetched successfully", contract);
  } catch (error) {
    return next(error);
  }
};

const completeContract = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id).populate("project");

    if (!contract) {
      return sendResponse(res, 404, "Contract not found", null, {
        code: "CONTRACT_NOT_FOUND",
      });
    }

    const isClient = contract.client.toString() === req.user._id.toString();
    const isFreelancer =
      contract.freelancer.toString() === req.user._id.toString();

    if (!isClient && !isFreelancer) {
      return sendResponse(
        res,
        403,
        "You are not allowed to complete this contract",
        null,
        { code: "FORBIDDEN" },
      );
    }

    if (contract.status !== "ACTIVE") {
      return sendResponse(res, 409, "Contract is not active", null, {
        code: "CONTRACT_NOT_ACTIVE",
      });
    }

    contract.status = "COMPLETED";
    await contract.save();

    await Project.findByIdAndUpdate(contract.project._id, {
      status: "COMPLETED",
    });

    return sendResponse(res, 200, "Contract completed successfully", contract);
  } catch (error) {
    return next(error);
  }
};

const cancelContract = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id).populate("project");

    if (!contract) {
      return sendResponse(res, 404, "Contract not found", null, {
        code: "CONTRACT_NOT_FOUND",
      });
    }

    if (
      contract.client.toString() !== req.user._id.toString() &&
      contract.freelancer.toString() !== req.user._id.toString()
    ) {
      return sendResponse(
        res,
        403,
        "You are not allowed to cancel this contract",
        null,
        { code: "FORBIDDEN" },
      );
    }

    if (contract.status !== "ACTIVE") {
      return sendResponse(res, 409, "Contract is not active", null, {
        code: "CONTRACT_NOT_ACTIVE",
      });
    }

    contract.status = "CANCELLED";
    await contract.save();

    await Project.findByIdAndUpdate(contract.project._id, {
      status: "CANCELLED",
    });

    return sendResponse(res, 200, "Contract cancelled successfully", contract);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getContracts,
  getContractById,
  completeContract,
  cancelContract,
};

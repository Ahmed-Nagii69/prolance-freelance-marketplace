const Message = require("../models/Message");
const Project = require("../models/Project");
const User = require("../models/User");
const Contract = require("../models/Contract");
const Proposal = require("../models/Proposal");
const sendResponse = require("../utils/response");
const { createNotification } = require("../utils/notify");

const sendMessage = async (req, res, next) => {
  try {
    if (req.user.role === "ADMIN") {
      return sendResponse(
        res,
        403,
        "Administrators cannot participate in conversations",
        null,
        { code: "FORBIDDEN" },
      );
    }

    const { receiver, project, content } = req.body;

    if (
      !receiver ||
      !project ||
      typeof content !== "string" ||
      !content.trim() ||
      content.length > 5000 ||
      receiver.toString() === req.user._id.toString()
    ) {
      return sendResponse(
        res,
        400,
        "Receiver, project and content are required",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return sendResponse(res, 404, "Project not found", null, {
        code: "PROJECT_NOT_FOUND",
      });
    }

    const receiverExists = await User.exists({ _id: receiver });
    if (!receiverExists) {
      return sendResponse(res, 404, "User not found", null, {
        code: "USER_NOT_FOUND",
      });
    }

    const senderIsClient =
      projectExists.client.toString() === req.user._id.toString();
    const senderHasProjectRelationship = await Proposal.exists({
      project,
      freelancer: req.user._id,
    });
    const receiverIsClient =
      projectExists.client.toString() === receiver.toString();
    const receiverHasProjectRelationship = await Proposal.exists({
      project,
      freelancer: receiver,
    });
    const relatedContract = await Contract.exists({
      project,
      $or: [{ client: req.user._id }, { freelancer: req.user._id }],
    });

    if (
      (!senderIsClient && !senderHasProjectRelationship) ||
      (!receiverIsClient && !receiverHasProjectRelationship) ||
      (!relatedContract && !senderIsClient && !receiverIsClient)
    ) {
      return sendResponse(
        res,
        403,
        "Users are not allowed to message for this project",
        null,
        {
          code: "FORBIDDEN",
        },
      );
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver,
      project,
      content: content.trim(),
      isRead: false,
    });

    await createNotification({
      user: receiver,
      actor: req.user._id,
      type: "MESSAGE",
      message: `${req.user.name} sent you a message about "${projectExists.title}"`,
      link: `/messages/project/${project}`,
    });

    return sendResponse(res, 201, "Message sent successfully", message);
  } catch (error) {
    return next(error);
  }
};

const getProjectMessages = async (req, res, next) => {
  try {
    if (req.user.role === "ADMIN") {
      return sendResponse(
        res,
        403,
        "Administrators cannot view private conversations",
        null,
        { code: "FORBIDDEN" },
      );
    }

    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return sendResponse(res, 404, "Project not found", null, {
        code: "PROJECT_NOT_FOUND",
      });
    }

    const isClient = project.client.toString() === req.user._id.toString();
    const isParticipant =
      (await Contract.exists({
        project: project._id,
        freelancer: req.user._id,
      })) ||
      (await Proposal.exists({
        project: project._id,
        freelancer: req.user._id,
      }));
    if (!isClient && !isParticipant) {
      return sendResponse(
        res,
        403,
        "You are not allowed to view these messages",
        null,
        {
          code: "FORBIDDEN",
        },
      );
    }

    const parsedPage = req.query.page === undefined ? 1 : Number(req.query.page);
    const parsedLimit = req.query.limit === undefined ? 50 : Number(req.query.limit);
    if (
      !Number.isInteger(parsedPage) ||
      parsedPage < 1 ||
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100
    ) {
      return sendResponse(res, 400, "Invalid message pagination", null, {
        code: "VALIDATION_ERROR",
      });
    }

    const total = await Message.countDocuments({ project: req.params.projectId });
    const messages = await Message.find({ project: req.params.projectId })
      .populate("sender", "name role")
      .populate("receiver", "name role")
      .sort({ createdAt: 1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    return sendResponse(
      res,
      200,
      "Project messages fetched successfully",
      { messages, pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
        hasNextPage: parsedPage * parsedLimit < total,
        hasPreviousPage: parsedPage > 1,
      } },
    );
  } catch (error) {
    return next(error);
  }
};

const getConversations = async (req, res, next) => {
  try {
    if (req.user.role === "ADMIN") {
      return sendResponse(res, 403, "Administrators cannot view private conversations", null, {
        code: "FORBIDDEN",
      });
    }

    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    })
      .populate("sender", "name role profileImage")
      .populate("receiver", "name role profileImage")
      .populate("project", "title status client")
      .sort({ createdAt: -1 })
      .limit(500);

    const conversations = [];
    const seenProjects = new Set();
    for (const message of messages) {
      if (!message.project || seenProjects.has(message.project._id.toString())) {
        continue;
      }
      seenProjects.add(message.project._id.toString());
      const other = message.sender._id.toString() === req.user._id.toString()
        ? message.receiver
        : message.sender;
      conversations.push({ project: message.project, other, contractStatus: null });
    }

    return sendResponse(res, 200, "Conversations fetched successfully", {
      conversations,
    });
  } catch (error) {
    return next(error);
  }
};

const markMessageAsRead = async (req, res, next) => {
  try {
    if (req.user.role === "ADMIN") {
      return sendResponse(
        res,
        403,
        "Administrators cannot view private conversations",
        null,
        { code: "FORBIDDEN" },
      );
    }

    const message = await Message.findById(req.params.id);

    if (!message) {
      return sendResponse(res, 404, "Message not found", null, {
        code: "MESSAGE_NOT_FOUND",
      });
    }

    if (message.receiver.toString() !== req.user._id.toString()) {
      return sendResponse(
        res,
        403,
        "You are not allowed to mark this message as read",
        null,
        { code: "FORBIDDEN" },
      );
    }

    message.isRead = true;
    await message.save();

    return sendResponse(res, 200, "Message marked as read", message);
  } catch (error) {
    return next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    if (req.user.role === "ADMIN") {
      return sendResponse(res, 403, "Forbidden", null, { code: "FORBIDDEN" });
    }
    const unreadCount = await Message.countDocuments({
      receiver: req.user._id,
      isRead: false,
    });
    return sendResponse(res, 200, "Unread message count fetched successfully", {
      unreadCount,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  sendMessage,
  getConversations,
  getProjectMessages,
  markMessageAsRead,
  getUnreadCount,
};

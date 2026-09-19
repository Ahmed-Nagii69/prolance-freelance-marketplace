const mongoose = require("mongoose");
const Service = require("../models/Service");
const Skill = require("../models/Skill");
const sendResponse = require("../utils/response");

const parseSkills = (skills) => {
  if (skills === undefined) return [];
  if (!Array.isArray(skills) || skills.length > 30) return null;
  return skills;
};

const createService = async (req, res, next) => {
  try {
    const { title, description, price, skills } = req.body;
    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const cleanDescription =
      typeof description === "string" ? description.trim() : "";
    const parsedPrice = Number(price);
    const parsedSkills = parseSkills(skills);

    if (
      cleanTitle.length < 3 ||
      cleanTitle.length > 100 ||
      !cleanDescription ||
      cleanDescription.length > 5000 ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice < 5 ||
      !parsedSkills ||
      parsedSkills.some((skill) => typeof skill !== "string")
    ) {
      return sendResponse(res, 400, "Invalid service data", null, {
        code: "VALIDATION_ERROR",
      });
    }

    if (parsedSkills.some((skill) => !mongoose.isValidObjectId(skill))) {
      return sendResponse(res, 400, "One or more skills are invalid", null, {
        code: "VALIDATION_ERROR",
      });
    }

    const uniqueSkills = [...new Set(parsedSkills)];
    const validSkillCount = await Skill.countDocuments({
      _id: { $in: uniqueSkills },
    });
    if (validSkillCount !== uniqueSkills.length) {
      return sendResponse(res, 400, "One or more skills are invalid", null, {
        code: "VALIDATION_ERROR",
      });
    }

    const service = await Service.create({
      title: cleanTitle,
      description: cleanDescription,
      price: parsedPrice,
      freelancer: req.user._id,
      skills: uniqueSkills,
    });

    await service.populate([
      { path: "freelancer", select: "name email role profileImage" },
      { path: "skills", select: "name description" },
    ]);
    return sendResponse(res, 201, "Service created successfully", service);
  } catch (error) {
    return next(error);
  }
};

const getServices = async (req, res, next) => {
  try {
    const services = await Service.find()
      .populate("freelancer", "name email role profileImage")
      .populate("skills", "name description")
      .sort({ createdAt: -1 });
    return sendResponse(res, 200, "Services fetched successfully", services);
  } catch (error) {
    return next(error);
  }
};

const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate("freelancer", "name email role profileImage")
      .populate("skills", "name description");
    if (!service) {
      return sendResponse(res, 404, "Service not found", null, {
        code: "SERVICE_NOT_FOUND",
      });
    }
    return sendResponse(res, 200, "Service fetched successfully", service);
  } catch (error) {
    return next(error);
  }
};

module.exports = { createService, getServices, getServiceById };

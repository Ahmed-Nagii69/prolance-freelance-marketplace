const Skill = require("../models/Skill");
const sendResponse = require("../utils/response");

const createSkill = async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const description = req.body.description;

    if (
      !name ||
      name.length > 80 ||
      (description !== undefined &&
        (typeof description !== "string" || description.length > 500))
    ) {
      return sendResponse(res, 400, "Invalid skill data", null, {
        code: "VALIDATION_ERROR",
      });
    }

    const existingSkill = await Skill.findOne({ name: name.toLowerCase() });
    if (existingSkill) {
      return sendResponse(res, 409, "Skill already exists", null, {
        code: "SKILL_EXISTS",
      });
    }

    const skill = await Skill.create({
      name,
      description: description || "",
    });
    return sendResponse(res, 201, "Skill created successfully", skill);
  } catch (error) {
    return next(error);
  }
};

const getSkills = async (req, res, next) => {
  try {
    const skills = await Skill.find().sort({ name: 1 });
    return sendResponse(res, 200, "Skills fetched successfully", skills);
  } catch (error) {
    return next(error);
  }
};

const getSkillById = async (req, res, next) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) {
      return sendResponse(res, 404, "Skill not found", null, {
        code: "SKILL_NOT_FOUND",
      });
    }
    return sendResponse(res, 200, "Skill fetched successfully", skill);
  } catch (error) {
    return next(error);
  }
};

module.exports = { createSkill, getSkills, getSkillById };

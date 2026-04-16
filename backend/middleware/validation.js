// Input validation utilities — Zod-backed wrappers
// Maintains backward-compatible exports for existing route files.

const {
  jobCreateSchema,
  jobUpdateSchema,
  applicationSchema,
  messageSchema,
  validate,
  escapeRegex,
} = require('./schemas');

/**
 * @param {object} data
 * @param {{ isUpdate?: boolean }} [options]
 */
const validateJobInput = (data, options = {}) => {
  const schema = options.isUpdate ? jobUpdateSchema : jobCreateSchema;
  const result = validate(schema, data);
  return result.valid ? { valid: true } : { valid: false, errors: result.errors };
};

const validateMessageInput = (content) => {
  const result = validate(messageSchema, { content });
  return result.valid ? { valid: true } : { valid: false, errors: result.errors };
};

const validateApplicationInput = (data) => {
  const result = validate(applicationSchema, data);
  return result.valid ? { valid: true } : { valid: false, errors: result.errors };
};

module.exports = {
  validateJobInput,
  validateMessageInput,
  validateApplicationInput,
  escapeRegex,
};

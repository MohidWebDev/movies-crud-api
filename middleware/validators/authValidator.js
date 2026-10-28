import { body } from "express-validator";

export const registerValidationRules = [
  body("name")
    .isString()
    .withMessage("Name must be text")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .bail()
    .isLength({ max: 100 })
    .withMessage("Name must be at most 100 characters"),
  body("email")
    .isString()
    .withMessage("Email must be text")
    .bail()
    .trim()
    .isEmail()
    .withMessage("A valid email is required")
    .bail()
    .isLength({ max: 254 })
    .withMessage("Email must be at most 254 characters"),
  // bcrypt only uses the first 72 bytes, so a longer limit adds nothing
  body("password")
    .isString()
    .withMessage("Password must be text")
    .bail()
    .isLength({ min: 6, max: 72 })
    .withMessage("Password must be between 6 and 72 characters"),
];

// Login is deliberately lenient about the email format, so existing accounts
// can always sign in. It only insists on plain strings, which is what
// blocks the operator injection.
export const loginValidationRules = [
  body("email")
    .isString()
    .withMessage("Email must be text")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Email is required"),
  body("password")
    .isString()
    .withMessage("Password must be text")
    .bail()
    .isLength({ min: 1, max: 200 })
    .withMessage("Password is required"),
];

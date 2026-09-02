import { body } from "express-validator";

export const productBody = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .bail()
    .isLength({ min: 2, max: 80 })
    .withMessage("Name must be between 2 and 80 characters."),
  body("category_id")
    .notEmpty()
    .withMessage("Category is required.")
    .bail()
    .isInt({ min: 1 })
    .withMessage("Category is required."),
  body("price")
    .notEmpty()
    .withMessage("Price is required.")
    .bail()
    .custom((value) => {
      if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) {
        throw new Error("Price must be a non-negative number with at most 2 decimal places.");
      }
      if (Number(value) >= 1_000_000) {
        throw new Error("Price must be less than 1,000,000.");
      }
      return true;
    }),
  // Multipart sends untouched fields as '', which is falsy but not null.
  body("stock_quantity")
    .optional({ values: "falsy" })
    .isInt({ min: 0, max: 99_999 })
    .withMessage("Stock quantity must be a whole number between 0 and 99,999."),
];

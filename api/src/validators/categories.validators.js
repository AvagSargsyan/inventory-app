import { body } from 'express-validator';

export const categoryBody = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .bail()
    .isLength({ min: 2, max: 60 }).withMessage('Name must be between 2 and 60 characters.'),
  body('description')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 500 }).withMessage('Description must be 500 characters or fewer.'),
];

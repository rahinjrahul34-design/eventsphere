const { z } = require('zod');

const passwordRegex = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[^A-Za-z0-9]/,
};

const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .refine((val) => passwordRegex.uppercase.test(val), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((val) => passwordRegex.lowercase.test(val), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((val) => passwordRegex.number.test(val), {
    message: 'Password must contain at least one number',
  })
  .refine((val) => passwordRegex.special.test(val), {
    message: 'Password must contain at least one special character',
  });

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Please provide a valid email address')
      .toLowerCase(),
  }),
});

const resendOtpSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Please provide a valid email address')
      .toLowerCase(),
  }),
});

const verifyOtpSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Please provide a valid email address')
      .toLowerCase(),
    otp: z
      .string({ required_error: 'Verification code is required' })
      .trim()
      .regex(/^\d{6}$/, 'Verification code must be exactly 6 digits'),
  }),
});

const resetPasswordSchema = z.object({
  body: z
    .object({
      resetToken: z
        .string({ required_error: 'Reset token is required' })
        .trim()
        .min(1, 'Reset token is required'),
      newPassword: passwordSchema,
      confirmPassword: z.string({ required_error: 'Confirm password is required' }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});

module.exports = {
  passwordSchema,
  forgotPasswordSchema,
  resendOtpSchema,
  verifyOtpSchema,
  resetPasswordSchema,
};

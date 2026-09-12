import { z } from 'zod';

export const jobCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be between 5 and 200 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z
    .string()
    .trim()
    .min(20, 'Description must be at least 20 characters')
    .max(10000, 'Description cannot exceed 10,000 characters'),
  budget: z
    .number({ invalid_type_error: 'Budget must be a number' })
    .positive('Budget must be positive')
    .max(1000000, 'Budget max is 1,000,000'),
  budgetType: z.enum(['fixed', 'hourly']),
  deadline: z.string().refine((d) => {
    const ms = new Date(d).getTime();
    if (Number.isNaN(ms)) return false;
    return ms + 86399999 > Date.now();
  }, 'Deadline must be a valid future date'),
  skills: z
    .array(z.string().trim().min(1))
    .min(1, 'At least one skill is required'),
  locationType: z.enum(['remote', 'on-site', 'hybrid']).default('remote'),
});

export const applicationSchema = z.object({
  coverLetter: z
    .string()
    .trim()
    .min(10, 'Cover letter must be at least 10 characters')
    .max(5000, 'Cover letter cannot exceed 5000 characters'),
  proposedRate: z
    .number({ invalid_type_error: 'Rate must be a number' })
    .positive('Proposed rate must be positive')
    .max(1000000, 'Proposed rate max is 1,000,000'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Valid email address is required'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[a-z]/, 'Must contain lowercase letters')
    .regex(/[A-Z]/, 'Must contain uppercase letters')
    .regex(/\d/, 'Must contain numbers')
    .regex(/[@$!%*?&]/, 'Must contain special characters (@$!%*?&)'),
  role: z.enum(['student', 'client']),
  university: z.string().trim().max(200).optional(),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the Terms of Service' }),
  }),
});

export type JobCreateInput = z.infer<typeof jobCreateSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

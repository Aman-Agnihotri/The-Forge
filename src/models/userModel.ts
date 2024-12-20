import { z } from 'zod';
import { DEFAULT_ROLE } from '../utils/constants';

export const registerUserSchema = z.object({
    username: z.string({
        required_error: "Username is required."
    })
        .min(1, "Username cannot be empty. It is required.")
        .min(6, "Username must be at least 6 characters long.")
        .regex(/^[a-zA-Z0-9]+$/, "Username must contain only letters and numbers.")
        .max(20, "Username cannot exceed 20 characters."),

    email: z.string({
        required_error: "Email is required."
    })
        .min(1, "Email cannot be empty. It is required.")
        .email("Email must be a valid email address."),

    password: z.string({
        required_error: "Password is required."
    })
        .min(1, "Password cannot be empty. It is required.")
        .min(8, "Password must be at least 8 characters long.")
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/, "Password must contain at least one uppercase letter, one lowercase letter, and one number.")
        .max(30, "Password cannot exceed 30 characters."),

    role_name: z.string()
        .min(1, "Role name cannot be empty.")
        .min(3, "Role name must be at least 3 characters long.")
        .regex(/^[a-zA-Z]+$/, "Role name must contain only letters.")
        .max(10, "Role name above 10 characters is invalid.")
        .optional()
        .default(DEFAULT_ROLE),
});

export const loginUserSchema = z.object({
    email: z.string({
        required_error: "Email is required."
    })
        .min(1, "Email cannot be empty. It is required.")
        .email("Email must be a valid email address."),

    password: z.string({
        required_error: "Password is required."
    })
        .min(1, "Password cannot be empty. It is required.")
        .min(8, "Invalid Password.")
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/, "Invalid Password.")
        .max(30, "Invalid Password."),
});

export const updateUserSchema = z.object({
    username: z.string()
        .min(1, "Username cannot be empty.")
        .min(3, "Username must be at least 3 characters long.")
        .regex(/^[a-zA-Z0-9]+$/, "Username must contain only letters and numbers.")
        .max(30, "Username cannot exceed 30 characters.")
        .optional(),

    email: z.string()
        .min(1, "Email cannot be empty.")
        .email("Email must be a valid email address.")
        .optional(),

    password: z.string()
        .min(1, "Password cannot be empty.")
        .min(8, "Password must be at least 8 characters long.")
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/, "Password must contain at least one uppercase letter, one lowercase letter, and one number.")
        .max(30, "Password cannot exceed 30 characters.")
        .optional(),

    role_name: z.string()
        .min(1, "Role name cannot be empty.")
        .min(3, "Role name must be at least 3 characters long.")
        .regex(/^[a-zA-Z]+$/, "Role name must contain only letters.")
        .max(10, "Role name above 10 characters is invalid.")
        .optional(),

}).refine(data => Object.values(data).some(value => value !== undefined), {
    message: "At least one field must be provided.",
});
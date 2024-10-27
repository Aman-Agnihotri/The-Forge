import { z } from 'zod';

export const registerUserSchema = z.object({
    username: z.string({
        required_error: "Username is required.",
    })
        .min(1, "Username cannot be empty. It is required.")
        .min(3, "Username must be at least 3 characters long.")
        .max(30, "Username cannot exceed 30 characters.")
        .regex(/^[a-zA-Z0-9]+$/, "Username must contain only letters and numbers."),
    email: z.string({
        required_error: "Email is required.",
    })
        .min(1, "Email cannot be empty. It is required.")
        .email("Email must be a valid email address."),
    password: z.string({
        required_error: "Password is required.",
    })
        .min(1, "Password cannot be empty. It is required.")
        .min(8, "Password must be at least 8 characters long."),
    role_name: z.string()
        .min(1, "Role name cannot be empty.")
        .optional(),
});

export const loginUserSchema = z.object({
    email: z.string({
        required_error: "Email is required.",
    })
        .min(1, "Email cannot be empty. It is required.")
        .email("Email must be a valid email address."),
    password: z.string({
        required_error: "Password is required.",
    })
        .min(1, "Password cannot be empty. It is required.")
        .min(8, "Password must be at least 8 characters long."),
});

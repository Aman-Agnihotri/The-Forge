import { z } from 'zod';
import logger from '../services/logger';
import { DEFAULT_ROLE } from '../utils/constants';

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
        .min(3, "Role name must be at least 3 characters.")
        .max(10, "Role name above 10 characters is invalid.")
        .optional()
        .default(DEFAULT_ROLE),
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

export const updateUserSchema = z.object({
    username: z.string()
        .min(1, "Username cannot be empty.")
        .min(3, "Username must be at least 3 characters long.")
        .max(30, "Username cannot exceed 30 characters.")
        .regex(/^[a-zA-Z0-9]+$/, "Username must contain only letters and numbers.")
        .optional(),
    email: z.string()
        .min(1, "Email cannot be empty.")
        .email("Email must be a valid email address.")
        .optional(),
    password: z.string()
        .min(1, "Password cannot be empty.")
        .min(8, "Password must be at least 8 characters long.")
        .optional(),
    role_name: z.string()
        .min(1, "Role name cannot be empty.")
        .min(3, "Role name must be at least 3 characters.")
        .max(10, "Role name above 10 characters is invalid.")
        .optional(),
}).refine(data => Object.values(data).some(value => value !== undefined), {
    message: "At least one field must be provided.",
});

export function validateUserId(id: string){
    const cuidRegex = /^c[0-9a-z]{24}$/i;
    return cuidRegex.test(id);
}

export function validateUserRequest(id: string | null, body: any, schema?: any,) {
    if (id) {
        if (!validateUserId(id)) {
            logger.warn(`Invalid user ID format: ${id}`);
            const error = new Error(`Invalid user ID format`);
            (error as any).status = 400;
            throw error;
        } else if (!body && !schema) {
            return id;
        }
    }

    if (body && schema) {
        const parseResult = schema.safeParse(body);

        if (!parseResult.success) {
            logger.warn("Invalid request body. \nError: " + parseResult.error.errors[0].message);
            const error = new Error(parseResult.error.errors[0].message);
            (error as any).status = 400;
            throw error;
        }

        return parseResult.data;
    } else {
        throw new Error('Provide atleast one of id or body and schema');
    }
}
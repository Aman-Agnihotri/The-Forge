import { z } from 'zod';

export const createRoleSchema = z.object({
    name: z.string({
        required_error: "Role name is required."
    })
        .min(1, "Role name cannot be empty.")
        .min(3, "Role name must be at least 3 characters.")
        .max(10, "Role name cannot exceed 10 characters.")
        .regex(/^[a-zA-Z]+$/, "Role name can only contain letters.")
});

export const updateRoleSchema = z.object({
    name: z.string({
        required_error: "Role name is required."
    })
        .min(1, "Role name cannot be empty.")
        .min(3, "Role name must be at least 3 characters.")
        .max(10, "Role name cannot exceed 10 characters.")
        .regex(/^[a-zA-Z]+$/, "Role name can only contain letters.")
});

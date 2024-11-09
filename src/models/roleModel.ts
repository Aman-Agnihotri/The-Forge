import { z } from 'zod';

export const roleActionSchema = z.object({
    name: z.string({
        required_error: "Role name is required."
    })
        .min(1, "Role name cannot be empty.")
        .min(3, "Role name must be at least 3 characters long.")
        .regex(/^[a-zA-Z]+$/, "Role name can only contain letters.")
        .max(10, "Role name cannot exceed 10 characters.")
});

export function validateRoleId(id: string){
    const cuidRegex = /^c[0-9a-z]{24}$/i;
    return cuidRegex.test(id);
}
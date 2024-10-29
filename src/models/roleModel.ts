import { z } from 'zod';
import logger from '../services/logger';

export const roleActionSchema = z.object({
    name: z.string({
        required_error: "Role name is required."
    })
        .min(1, "Role name cannot be empty.")
        .min(3, "Role name must be at least 3 characters.")
        .max(10, "Role name cannot exceed 10 characters.")
        .regex(/^[a-zA-Z]+$/, "Role name can only contain letters.")
});

export function validateRoleId(id: string){
    const cuidRegex = /^c[0-9a-z]{24}$/i;
    return cuidRegex.test(id);
}

export function validateRoleRequest(id: string | null, body: any, schema?: any,) {
    if (id) {
        if (!validateRoleId(id)) {
            logger.warn(`Invalid role ID format: ${id}`);
            const error = new Error('Invalid role ID format');
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
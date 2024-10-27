import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma'; // Import Prisma client
import logger from '../services/logger';
import { roleActionSchema } from '../models/roleModel';

/**
 * Retrieves all roles with their associated users.
 * 
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {500} - If there is an error while retrieving the roles
 */
export const getAllRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const roles = await prisma.roles.findMany({
            select: { 
                id: true, 
                name: true,
                users: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                } 
            }
        });
        logger.info('Roles fetched successfully');
        res.json(roles);
        return;
    } catch (error) {
        logger.error(error);
        next(error);
        res.status(500).json({ message: 'Encountered some error while retrieving roles' });
        return;
    }
};

/**
 * Retrieves a role by its ID.
 * 
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {404} - If the role is not found
 * @throws {500} - If there is an error while retrieving the role
 */
export const getRoleById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        const role = await prisma.roles.findUnique({
            where: { id },
            select: { 
                id: true, 
                name: true,
                users: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                } 
            }
        })
        if (!role) {
            logger.warn(`Role with id ${id} not found`);
            res.status(404).json({ message: 'Role not found' });
            return;
        }

        logger.info(`Role with id ${id} fetched successfully`);
        res.json(role);
        return;
    } catch (error) {
        logger.error(error);
        next(error);
        res.status(500).json({ message: 'Encountered some error while retrieving role' });
        return;
    }
}

/**
 * Create a new role.
 * 
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {400} - If the role name is not provided in the request body
 * @throws {400} - If the role name already exists
 * @throws {500} - If an error occurs while creating the role
 */
export const createRole = async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = roleActionSchema.safeParse(req.body);

    if (!parseResult.success) {
        logger.warn("Role creation failed. Invalid request body.\nError: " + parseResult.error.errors[0].message);
        res.status(400).json({ message: parseResult.error.errors[0].message });
        return;
    }

    const { name } = parseResult.data;

    try {
        // Create the new role
        const newRole = await prisma.roles.create({ 
            data: { name },
            select: {
                id: true,
                name: true
            }
        });

        logger.info(`Role $(newRole.name) created successfully`);

        res.status(201).json(newRole);
        return;
    } catch (error) {
        if ((error as any).code === 'P2002') {
            // Handle unique constraint violations (e.g., role name already exists)
            logger.warn(`Role name ${name} already exists`);
            res.status(400).json({ message: 'Role name already exists' });
            return;
        } else {
            logger.error(error);
            next(error);
            res.status(500).json({ message: 'Encountered some error while creating role' });
            return;
        }
    }
};

/**
 * Updates a role by its ID.
 * 
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {400} - If the role name is not provided in the request body
 * @throws {404} - If the role with the provided ID does not exist
 * @throws {500} - If an error occurs while updating the role
 */
export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const parseResult = roleActionSchema.safeParse(req.body);

    if (!parseResult.success) {
        logger.warn("Role update failed. Invalid request body.\nError: " + parseResult.error.errors[0].message);
        res.status(400).json({ message: parseResult.error.errors[0].message });
        return;
    }

    const { name } = parseResult.data;

    try {
        const updatedRole = await prisma.roles.update({
            where: { id },
            data: { name },
            select: { 
                id: true, 
                name: true,
                users: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                } 
            }
        });

        if (!updatedRole) {
            logger.warn(`Role with id ${id} not found`);
            res.status(404).json({ message: 'Role not found' });
            return;
        }

        logger.info(`Role with id ${id} updated successfully`);
        res.json(updatedRole);
        return;
    } catch (error) {
        logger.error(error);
        next(error);
        res.status(500).json({ message: 'Encountered some error while updating role' });
        return;
    }
}

/**
 * Deletes a role by its ID.
 * 
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {404} - If the role is not found
 * @throws {500} - If there is an error while deleting the role
 */
export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {

        const role = await prisma.roles.findUnique({
            where: { id }
        });

        if (!role) {
            logger.warn(`Role with id ${id} not found`);
            res.status(404).json({ message: 'Role not found' });
            return;
        }
        
        // Disconect all users from the role
        await prisma.user_role.deleteMany({
            where: { roleId: id }
        });
        
        // Delete the role
        await prisma.roles.delete({ where: { id } });
            
        logger.info(`Role ${role.name} deleted successfully`);
        res.json({ message: 'Role deleted successfully' });
        return;
    } catch (error) {
        logger.error(error);
        next(error);
        res.status(500).json({ message: 'Encountered some error while deleting role' });
        return;
    }
}
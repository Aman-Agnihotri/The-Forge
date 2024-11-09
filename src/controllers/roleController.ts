import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma'; // Import Prisma client
import logger from '../services/logger';
import { roleActionSchema, validateRoleId } from '../models/roleModel';

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
        logger.debug('Roles fetched successfully.');
        res.json(roles);
        return;
    } catch (error) {
        next({message: 'Encountered some error while retrieving roles.', error});
    }
};

/**
 * Retrieves a role by its ID.
 * 
 * @param {Request} req - The request object containing the role ID in params
 * @param {Response} res - The response object to send the role data or error message
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {400} - If the role ID format is invalid
 * @throws {404} - If the role is not found
 * @throws {500} - If there is an error while retrieving the role
 */
export const getRoleById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!validateRoleId(id)) {
        logger.info(`Role fetching failed. Invalid role ID format: ${id}`)
        res.status(400).json({ message: 'Invalid role ID format.' });
        return;
    }

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
            logger.info(`Role fetching failed. Role with id '${id}' not found.`);
            res.status(404).json({ message: 'Role not found.' });
            return;
        }

        logger.debug(`Role with id '${id}' fetched successfully.`);
        res.json(role);
        return;
    } catch (error) {
        next({ message: "Encountered some error while retrieving role.", error });
    }
}

/**
 * Creates a new role.
 * 
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {400} - If the request body is invalid
 * @throws {409} - If a role with the same name already exists
 * @throws {500} - If an error occurs while creating the role
 */
export const createRole = async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = roleActionSchema.safeParse(req.body);

    if (!parseResult.success) {
        logger.info("Role creation failed. Invalid request body.\nError: " + parseResult.error.errors[0].message);
        res.status(400).json({ message: parseResult.error.errors[0].message });
        return;
    }

    const { name } = parseResult.data;

    try {

        // Check if the role already exists
        const role = await prisma.roles.findFirst({ 
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive'
                }
            } 
        });

        if (role) {
            logger.info(`Role creation failed. Role with name '${name}' already exists.`);
            res.status(409).json({ message: 'Role already exists.' });
            return;
        }

        // Create the new role
        const newRole = await prisma.roles.create({ 
            data: { name },
            select: {
                id: true,
                name: true
            }
        });

        logger.debug(`Role '${newRole.name}' created successfully.`);

        res.status(201).json(newRole);
        return;
    } catch (error) {
        next({message: 'Encountered some error while creating role.', error});
    }
};

/**
 * Updates a role by its ID. Only admins can update roles.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 *
 * @throws {400} - If the request body is invalid or the role ID is invalid
 * @throws {404} - If the role with the provided ID does not exist
 * @throws {500} - If an error occurs while updating the role
 */
export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!validateRoleId(id)) {
        logger.info(`Role update failed. Invalid role ID format: ${id}`)
        res.status(400).json({ message: 'Invalid role ID format.' });
        return;
    }

    const parseResult = roleActionSchema.safeParse(req.body);

    if (!parseResult.success) {
        logger.info("Role update failed. Invalid request body.\nError: " + parseResult.error.errors[0].message);
        res.status(400).json({ message: parseResult.error.errors[0].message });
        return;
    }

    const { name } = parseResult.data;

    try {
        // Check if the role exists
        const role = await prisma.roles.findUnique({ where: { id } });

        if (!role) {
            logger.info(`Role update failed. Role with id '${id}' not found.`);
            res.status(404).json({ message: 'Role not found.' });
            return;
        }

        if (role.name === name) {
            logger.info(`Role with id '${id}' not updated. Role name is the same as before.`);
            res.status(400).json({ message: 'Role name is the same as before.' });
            return;
        }

        // Check if the new role name already exists
        const existingRole = await prisma.roles.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive'
                }
            }
        });

        if (existingRole) {
            logger.info(`Role update failed. Role with name '${name}' already exists.`);
            res.status(409).json({ message: 'Role already exists.' });
            return;
        }

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

        logger.debug(`Role with id '${id}' updated successfully.`);
        res.json(updatedRole);
        return;
    } catch (error) {
        next({ message: "Encountered some error while updating role.", error });
    }
}

/**
 * Deletes a role by its ID. Only admins can delete roles.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 *
 * @throws {400} - If the role ID format is invalid
 * @throws {404} - If the role with the provided ID does not exist
 * @throws {500} - If an error occurs while deleting the role
 */
export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!validateRoleId(id)) {
        logger.info(`Role deletion failed. Invalid role ID format: ${id}`)
        res.status(400).json({ message: 'Invalid role ID format.' });
        return;
    }

    try {

        const role = await prisma.roles.findUnique({
            where: { id }
        });

        if (!role) {
            logger.info(`Role deletion failed. Role with id '${id}' not found.`);
            res.status(404).json({ message: 'Role not found.' });
            return;
        }
        
        // Disconect all users from the role
        await prisma.user_role.deleteMany({
            where: { roleId: id }
        });
        
        // Delete the role
        await prisma.roles.delete({ where: { id } });
            
        logger.debug(`Role '${role.name}' deleted successfully.`);
        res.json({ message: 'Role deleted successfully.' });
        return;
    } catch (error) {
        next({ message: "Encountered some error while deleting role.", error });
    }
}
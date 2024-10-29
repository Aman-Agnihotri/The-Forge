import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma'; // Import Prisma client
import logger from '../services/logger';
import { roleActionSchema, validateRoleRequest } from '../models/roleModel';

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

    try {
        const roleId = validateRoleRequest(id, null, null);

        const role = await prisma.roles.findUnique({
            where: { id: roleId },
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
            logger.warn(`Role with id '${roleId}' not found`);
            res.status(404).json({ message: 'Role not found' });
            return;
        }

        logger.info(`Role with id '${roleId}' fetched successfully`);
        res.json(role);
        return;
    } catch (error) {
        if ((error as any).status){
            res.status((error as any).status).json({ message: (error as any).message });
            return;
        }
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

    const { name } = validateRoleRequest(null, req.body, roleActionSchema);

    try {

        // Check if the role already exists
        const role = await prisma.roles.findUnique({ where: { name } });
        if (role) {
            logger.warn(`Role '${name}' already exists`);
            res.status(409).json({ message: 'Role already exists' });
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

        logger.info(`Role '${newRole.name}' created successfully`);

        res.status(201).json(newRole);
        return;
    } catch (error) {
        if ((error as any).status){
            res.status((error as any).status).json({ message: (error as any).message });
            return;
        }
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

    const { name } = validateRoleRequest(id, req.body, roleActionSchema);

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
            logger.warn(`Role with id '${id}' not found`);
            res.status(404).json({ message: 'Role not found' });
            return;
        }

        logger.info(`Role with id '${id}' updated successfully`);
        res.json(updatedRole);
        return;
    } catch (error) {
        if ((error as any).status){
            res.status((error as any).status).json({ message: (error as any).message });
            return;
        }
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

    try {

        const roleId = validateRoleRequest(id, null, null);

        const role = await prisma.roles.findUnique({
            where: { id: roleId }
        });

        if (!role) {
            logger.warn(`Role with id '${roleId}' not found`);
            res.status(404).json({ message: 'Role not found' });
            return;
        }
        
        // Disconect all users from the role
        await prisma.user_role.deleteMany({
            where: { roleId: id }
        });
        
        // Delete the role
        await prisma.roles.delete({ where: { id } });
            
        logger.info(`Role '${role.name}' deleted successfully`);
        res.json({ message: 'Role deleted successfully' });
        return;
    } catch (error) {
        if ((error as any).status){
            res.status((error as any).status).json({ message: (error as any).message });
            return;
        }
        next({ message: "Encountered some error while deleting role.", error });
    }
}
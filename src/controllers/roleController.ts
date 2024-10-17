import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma'; // Import Prisma client
import logger from '../services/logger';

// Get all roles
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

// Get role by ID
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

// Create a new role
export const createRole = async (req: Request, res: Response, next: NextFunction) => {
    const { name } = req.body;

    // Check if the role is given in the request body
    if (!name) {
        logger.warn('Role name is required to create a new role');
        res.status(400).json({ message: 'Role name is required' });
        return;
    }

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

// Update a role
export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { name } = req.body;

    // Check if the role is given in the request body
    if (!name) {
        logger.warn('Role name not provided in the update request');
        res.status(400).json({ message: 'Role name is required' });
        return;
    }

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

// Delete a role
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
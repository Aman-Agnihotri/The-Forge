import { Request, Response } from 'express';
import { prisma } from '../config/prisma'; // Import Prisma client

// Get all roles
export const getAllRoles = async (req: Request, res: Response) => {
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
        res.json(roles);
        return;
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};

// Get role by ID
export const getRoleById = async (req: Request, res: Response) => {
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
            res.status(404).json({ message: 'Role not found' });
            return;
        }
        res.json(role);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
}

// Create a new role
export const createRole = async (req: Request, res: Response) => {
    const { name } = req.body;

    // Check if the role is given in the request body
    if (!name) {
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

        res.status(201).json(newRole);
        return;
    } catch (error) {
        if ((error as any).code === 'P2002') {
            // Handle unique constraint violations (e.g., role name already exists)
            res.status(400).json({ message: 'Role name already exists' });
            return;
        } else {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
            return;
        }
    }
};

// Update a role
export const updateRole = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;

    // Check if the role is given in the request body
    if (!name) {
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
            res.status(404).json({ message: 'Role not found' });
            return;
        }

        res.json(updatedRole);
        return;
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
}

// Delete a role
export const deleteRole = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {

        const role = await prisma.roles.findUnique({
            where: { id }
        });

        if (!role) {
            res.status(404).json({ message: 'Role not found' });
            return;
        }
        
        // Disconect all users from the role
        await prisma.user_role.deleteMany({
            where: { roleId: id }
        });
        
        // Delete the role
        await prisma.roles.delete({ where: { id } });
            
        res.json({ message: 'Role deleted successfully' });
        return;
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
}
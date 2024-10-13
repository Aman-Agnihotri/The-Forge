import { Request, Response } from 'express';
import { prisma } from '../config/prisma'; // Import Prisma client

// Get all roles
export const getAllRoles = async (req: Request, res: Response) => {
    try {
        const roles = await prisma.roles.findMany({
            select: { id: true, name: true }
        });
        res.json(roles);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get role by ID
export const getRoleById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const role = await prisma.roles.findUnique({
            where: { id },
            select: { id: true, name: true }
        })
        if (!role) {
            res.status(404).json({ message: 'Role not found' });
            return;
        }
        res.json(role);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

// Create a new role
export const createRole = async (req: Request, res: Response) => {
    const { name } = req.body;

    try {
        // Create the new role
        const newRole = await prisma.roles.create({ data: { name } });

        res.status(201).json(newRole);
    } catch (error) {
        if ((error as any).code === 'P2002') {
            // Handle unique constraint violations (e.g., role name already exists)
            res.status(400).json({ message: 'Role name already exists' });
        } else {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

// Update a role
export const updateRole = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;

    try {
        const updatedRole = await prisma.roles.update({
            where: { id },
            data: { name }
        });

        if (!updatedRole) {
            res.status(404).json({ message: 'Role not found' });
            return;
        }

        res.json(updatedRole);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
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
        } else {
            await prisma.roles.delete({ where: { id } });
        }

        res.json({ message: 'Role deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}
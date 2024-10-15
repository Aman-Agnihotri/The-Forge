import { Request, Response } from 'express';
import { prisma } from '../config/prisma'; // Import Prisma client
import { hashPassword } from '../utils/passwordHash';

// Get all users (Admin only)
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.users.findMany({
            where: { deletedAt: null }, // Filter out soft-deleted users
            select: { 
                id: true, 
                username: true, 
                email: true, 
                createdAt: true, 
                roles: {
                    select: {
                        role: true
                    }
                },
                providers: {
                    select: {
                        providerName: true,
                        providerId: true
                    }
                }
            }
        });
        res.json(users);
        return;
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};

// Get all users, including soft deleted (Admin only)
export const getAllUsersIncludingDeleted = async (req: Request, res: Response) => {
    try {
        const users = await prisma.users.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                createdAt: true,
                deletedAt: true,  // Include deletedAt field to differentiate active and soft-deleted users
                roles: {
                    select: {
                        role: true
                    }
                },
                providers: {
                    select: {
                        providerName: true,
                        providerId: true
                    }
                }
            }
        });
        res.json(users);
        return;
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};

// Get a user by ID
export const getUserById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const user = await prisma.users.findUnique({
            where: { id, deletedAt: null }, // Ensure the user isn’t soft deleted
            select: { 
                id: true,
                username: true,
                email: true,
                createdAt: true,
                roles: {
                    select: {
                        role: true
                    }
                },
                providers: {
                    select: {
                        providerName: true,
                        providerId: true
                    }
                }
            }
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json(user);
        return;
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};

// Get a user by ID, including soft deleted users (Admin only)
export const getUserByIdIncludingDeleted = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const user = await prisma.users.findUnique({
            where: { id },
            select: { 
                id: true,
                username: true,
                email: true,
                createdAt: true,
                deletedAt: true,
                roles: {
                    select: {
                        role: true
                    }
                },
                providers: {
                    select: {
                        providerName: true,
                        providerId: true
                    }
                }
            }
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};

// Create a new user (Admin only)
export const createUser = async (req: Request, res: Response) => {
    const { email, username, password, role_name } = req.body;

    if (!email){
        res.status(400).json({ message: 'Email is required' });
        return;
    } else if (!username){
        res.status(400).json({ message: 'Username is required' });
        return;
    } else if (!password){
        res.status(400).json({ message: 'Password is required' });
        return;
    }

    try {
        // Hash the password (only for non-OAuth users)
        const hashed_password = await hashPassword(password);

        // Create a new user
        const newUser = await prisma.users.create({
            data: {
                username,
                email,
                password: hashed_password,
            },
            select: {
                id: true, 
                username: true, 
                email: true, 
                createdAt: true, 
            }
        });

        // If a role_name is provided, find the role and connect it
        if (role_name) {
            const role = await prisma.roles.findUnique({ where: { name: role_name } });

            if (!role) {
                res.status(400).json({ message: 'Role does not exist' });
                return;
            }

            if (role?.id) {
                await prisma.user_role.create({
                    data: {
                        userId: newUser.id,
                        roleId: role.id
                    }
                });
            }
        } else {
            // If no role_name is provided, assign the default role
            const defaultRole = await prisma.roles.findUnique({ where: { name: 'user' } });

            if (defaultRole?.id) {
                await prisma.user_role.create({
                    data: {
                        userId: newUser.id,
                        roleId: defaultRole.id
                    }
                });
            } else {
                res.status(400).json({ message: 'default "user" role does not exist' });
                return;
            }
        }

        res.status(201).json(newUser);
        return;
    } catch (error) {
        if ((error as any).code === 'P2002') {
            // Handle unique constraint violations (e.g., email/username already exists)
            res.status(400).json({ message: 'Email or username already exists' });
            return;
        } else {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
            return;
        }
    }
};

// Update a user
export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const id_of_user_to_update = id;
    const { email, username, password, role_name } = req.body;

    const authenticatedUser = req.user as any;
    const user = await prisma.users.findUnique({ where: { id: authenticatedUser.id } });

    if (!email && !username && !password && !role_name){
        res.status(400).json({ message: 'At least one field is required' });
        return;
    }

    try {
        const userUpdateData: any = {};

        if(username){
            userUpdateData.username = username;
        }

        if(email){
            userUpdateData.email = email;
        }

        if(password){
            if (id_of_user_to_update === user?.id) {
                userUpdateData.password = await hashPassword(password);
                console.log("User is updating their own password.");

                // Check if the authenticated user is an admin
            } else if(authenticatedUser.roles.every((role: any) => role.role.name === 'admin')) {
                userUpdateData.password = await hashPassword(password);
                console.log("User is an admin and is updating another user's password.");

            } else {
                res.status(403).json({ message: 'You do not have permission to update this user. You can only change your own password. Please contact an admin for additional help.' });
                return;
            }
        }

        // If a new roleName is provided, find the role and connect it
        if (role_name) {
            const role = await prisma.roles.findUnique({ where: { name: role_name } });

            if (!role) {
                res.status(400).json({ message: 'Role does not exist' });
                return;
            }

            //Check if the user is already connected to a role
            const userRole = await prisma.user_role.findFirst({
                where: {
                    userId: id_of_user_to_update,
                    roleId: role.id
                }
            });

            if (userRole) {
                userUpdateData.roleId = role.id; // Update the role

            } else if (role?.id) {
                await prisma.user_role.create({
                    data: {
                        userId: id_of_user_to_update,
                        roleId: role.id
                    }
                });
            }
        }

        const updatedUser = await prisma.users.update({
            where: { id: id_of_user_to_update },
            data: userUpdateData,
            select: { 
                id: true,
                username: true,
                email: true,
                updatedAt: true
            }
        });

        res.json(updatedUser);
        return;
    } catch (error) {
        if ((error as any).code === 'P2025') {
            // Record not found
            res.status(404).json({ message: 'User not found' });
            return;
        } else {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
            return;
        }
    }
};

// Soft Delete a User (Admin Only)
export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        await prisma.users.update({
            where: { id },
            data: { deletedAt: new Date() } // Mark user as deleted by setting the timestamp
        });

        res.json({ message: 'User deleted successfully' });
        return;
    } catch (error) {
        if ((error as any).code === 'P2025') {
            res.status(404).json({ message: 'User not found' });
            return;
        } else {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
            return;
        }
    }
};

// Restore a soft-deleted user (Admin only)
export const restoreUser = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Ensure the user is currently soft-deleted
        const user = await prisma.users.findUnique({
            where: { id, deletedAt: { not: null } }
        });

        if (!user?.deletedAt) {
            res.status(404).json({ message: 'User not found or not soft-deleted' });
            return;
        }

        // Restore the user by setting deletedAt to null
        await prisma.users.update({
            where: { id },
            data: { deletedAt: null }
        });

        res.json({ message: 'User restored successfully' });
        return;
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};

// Permanently delete a user (Admin only)
export const permanentlyDeleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const user = await prisma.users.findUnique({
            where: { id },
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Delete the providers associated with the user
        await prisma.user_provider.deleteMany({
            where: { userId: id },
        })

        // Ensure the user is freed of any roles
        await prisma.user_role.deleteMany({
            where: { userId: id },
        });

        // Permanently delete the user
        await prisma.users.delete({
            where: { id },
        });

        res.json({ message: 'User permanently deleted successfully' });
        return;
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma'; // Import Prisma client
import { hashPassword } from '../utils/passwordHash';
import logger from '../services/logger';

// Get all users (Admin only)
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
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
        logger.info(`Users fetched successfully `)
        res.json(users);
        return;
    } catch (error) {
        logger.error(error);
        next(error);
        res.status(500).json({ message: 'Encountered some error while retrieving users' });
        return;
    }
};

// Get all users, including soft deleted (Admin only)
export const getAllUsersIncludingDeleted = async (req: Request, res: Response, next: NextFunction) => {
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
        logger.info(`All users (including soft deleted) fetched successfully`)
        res.json(users);
        return;
    } catch (error) {
        logger.error(error);
        next(error);
        res.status(500).json({ message: 'Encountered some error while retrieving all users' });
        return;
    }
};

// Get a user by ID
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
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
            logger.warn(`User with user ID $(id) not found. The user may be soft-deleted.`)
            res.status(404).json({ message: 'User not found' });
            return;
        }

        logger.info(`User $(user.username) fetched successfully`)
        res.json(user);
        return;
    } catch (error) {
        logger.error(error);
        next(error);
        res.status(500).json({ message: `Encountered some error while retrieving user with ID ${id}` });
        return;
    }
};

// Get a user by ID, including soft deleted users (Admin only)
export const getUserByIdIncludingDeleted = async (req: Request, res: Response, next: NextFunction) => {
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
            logger.warn(`User with user ID $(id) not found`)
            res.status(404).json({ message: 'User not found' });
            return;
        }

        logger.info(`User $(user.username) fetched successfully`)
        res.json(user);
        return;
    } catch (error) {
        logger.error(error);
        next(error);
        res.status(500).json({ message: `Encountered some error while retrieving user with ID ${id}` });
        return;
    }
};

// Create a new user (Admin only)
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    const { email, username, password, role_name } = req.body;

    if (!email){
        logger.warn("User creation failed. Email is required.");
        res.status(400).json({ message: 'Email is required' });
        return;
    } else if (!username){
        logger.warn("User creation failed. Username is required.");
        res.status(400).json({ message: 'Username is required' });
        return;
    } else if (!password){
        logger.warn("User creation failed. Password is required.");
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
                logger.warn(`User creation failed. Role ${role_name} does not exist.`);
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
                logger.warn(`User creation failed. Default "user" role does not exist.`);
                res.status(400).json({ message: 'default "user" role does not exist' });
                return;
            }
        }

        logger.info(`User $(newUser.username) created successfully`)
        res.status(201).json(newUser);
        return;
    } catch (error) {
        if ((error as any).code === 'P2002') {
            // Handle unique constraint violations (e.g., email/username already exists)
            logger.warn(`User creation failed. Email already exists.`);
            res.status(400).json({ message: 'Email already exists' });
            return;
        } else {
            logger.error(error);
            next(error);
            res.status(500).json({ message: 'Encountered some error while creating user' });
            return;
        }
    }
};

// Update a user
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const id_of_user_to_update = id;
    const { email, username, password, role_name } = req.body;

    const authenticatedUser = req.user as any;
    const user = await prisma.users.findUnique({ where: { id: authenticatedUser.id } });

    if (!email && !username && !password && !role_name){
        logger.warn("User update failed. At least one field is required.");
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
                logger.info("User with id $(id_of_user_to_update) is updating their own password.");

                // Check if the authenticated user is an admin
            } else if(authenticatedUser.roles.every((role: any) => role.role.name === 'admin')) {
                userUpdateData.password = await hashPassword(password);
                logger.info("User with id $(authenticatedUser.id) is an admin and is updating the password of user with id $(id_of_user_to_update).");

            } else {
                logger.warn("User update failed. Requesting user does not have permission to update this user. The user with id $(authenticatedUser.id) is trying to change the password of user with id $(id_of_user_to_update).");
                res.status(403).json({ message: 'You do not have permission to update this user. You can only change your own password. Please contact an admin for additional help.' });
                return;
            }
        }

        // If a new roleName is provided, find the role and connect it
        if (role_name) {
            const role = await prisma.roles.findUnique({ where: { name: role_name } });

            if (!role) {
                logger.warn(`User update failed. Role ${role_name} does not exist.`);
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

        logger.info(`User $(updatedUser.username) updated successfully`)
        res.json(updatedUser);
        return;
    } catch (error) {
        if ((error as any).code === 'P2025') {
            // Record not found
            logger.warn(`User update failed. User with id $(id) not found.`);
            res.status(404).json({ message: 'User not found' });
            return;
        } else {
            logger.error(error);
            next(error);
            res.status(500).json({ message: 'Encountered some error while updating user' });
            return;
        }
    }
};

// Soft Delete a User (Admin Only)
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        await prisma.users.update({
            where: { id },
            data: { deletedAt: new Date() } // Mark user as deleted by setting the timestamp
        });

        logger.info(`User with id ${id} deleted successfully`);
        res.json({ message: 'User deleted successfully' });
        return;
    } catch (error) {
        if ((error as any).code === 'P2025') {
            logger.warn(`User delete failed. User with id $(id) not found.`);
            res.status(404).json({ message: 'User not found' });
            return;
        } else {
            logger.error(error);
            res.status(500).json({ message: 'Encountered some error while deleting user' });
            return;
        }
    }
};

// Restore a soft-deleted user (Admin only)
export const restoreUser = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        // Ensure the user is currently soft-deleted
        const user = await prisma.users.findUnique({
            where: { id, deletedAt: { not: null } }
        });

        if (!user) {
            logger.warn(`User restore failed. User with id $(id) not found.`);
            res.status(404).json({ message: 'User not found' });
            return;
        } else if (!user.deletedAt) {
            logger.warn(`User restore failed. User with id $(id) is not soft-deleted.`);
            res.status(400).json({ message: 'User is not soft-deleted' });
            return;
        }

        // Restore the user by setting deletedAt to null
        await prisma.users.update({
            where: { id },
            data: { deletedAt: null }
        });

        logger.info(`User with id ${id} restored successfully`);
        res.json({ message: 'User restored successfully' });
        return;
    } catch (error) {
        logger.error(error);
        next(error);
        res.status(500).json({ message: 'Encountered some error while restoring user' });
        return;
    }
};

// Permanently delete a user (Admin only)
export const permanentlyDeleteUser = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        const user = await prisma.users.findUnique({
            where: { id },
        });

        if (!user) {
            logger.warn(`User permanent deletion failed. User with id $(id) not found.`);
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

        logger.info(`User with id ${id} permanently deleted successfully`);
        res.json({ message: 'User permanently deleted successfully' });
        return;
    } catch (error) {
        logger.error(error);
        next(error);
        res.status(500).json({ message: 'Encountered some error while permanently deleting user' });
        return;
    }
};
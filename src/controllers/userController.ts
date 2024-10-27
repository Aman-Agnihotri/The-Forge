import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma'; // Import Prisma client
import { hashPassword } from '../utils/passwordHash';
import logger from '../services/logger';
import { DEFAULT_ROLE } from '../utils/constants';
import { registerUserSchema, updateUserSchema } from '../models/userModel';

/**
 * Retrieves all non-deleted users and their associated roles and providers.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 *
 * @throws {500} - If there is an error while retrieving the users
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await prisma.users.findMany({
            where: { deletedAt: null }, // Filter out soft-deleted users
            select: { 
                id: true, 
                username: true, 
                email: true, 
                createdAt: true,
                updatedAt: true,
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

/**
 * Retrieves all users, including soft deleted users.
 * 
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {500} - If there is an error while retrieving the users
 */
export const getAllUsersIncludingDeleted = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await prisma.users.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                createdAt: true,
                updatedAt: true,
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

/**
 * Retrieves a user by its ID.
 * 
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {404} - If the user is not found
 * @throws {500} - If there is an error while retrieving the user
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        const user = await prisma.users.findUnique({
            where: { id, deletedAt: null }, // Ensure the user isn’t soft deleted
            select: { 
                id: true,
                username: true,
                email: true,
                roles: {
                    select: {
                        role: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                providers: {
                    select: {
                        providerName: true,
                    }
                }
            }
        });

        if (!user) {
            logger.warn(`User with user ID ${id} not found. The user may be soft-deleted.`)
            res.status(404).json({ message: 'User not found' });
            return;
        }

        logger.info(`User '${user.username}' fetched successfully`)
        res.json(user);
        return;
    } catch (error) {
        logger.error(error);
        next(error);
        res.status(500).json({ message: `Encountered some error while retrieving user with ID ${id}` });
        return;
    }
};

/**
 * Retrieves a user by their ID. This includes soft-deleted users.
 * 
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {404} - If the user is not found
 * @throws {500} - If there is an error while retrieving the user
 */
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
                updatedAt: true,
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
            logger.warn(`User with user ID ${id} not found`)
            res.status(404).json({ message: 'User not found' });
            return;
        }

        logger.info(`User ${user.username} fetched successfully`)
        res.json(user);
        return;
    } catch (error) {
        logger.error(error);
        next(error);
        res.status(500).json({ message: `Encountered some error while retrieving user with ID ${id}` });
        return;
    }
};

/**
 * Create a new user.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 *
 * @throws {400} - If the request body is invalid
 * @throws {500} - If an error occurs while creating the user
 */
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = registerUserSchema.safeParse(req.body);

    if (!parseResult.success) {
        logger.warn("User creation failed. Invalid request body. \nError: " + parseResult.error.errors[0].message);
        res.status(400).json({ message: parseResult.error.errors[0].message });
        return;
    }

    const { email, username, password, role_name } = parseResult.data;

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
                roles: {
                    select: {
                        role: true
                    }
                }
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

            // Append the role to the newUser object
            newUser.roles = [{ role: role }];

        } else {
            // If no role_name is provided, assign the default role
            const defaultRole = await prisma.roles.findUnique({ where: { name: DEFAULT_ROLE } });

            if (defaultRole?.id) {
                await prisma.user_role.create({
                    data: {
                        userId: newUser.id,
                        roleId: defaultRole.id
                    }
                });
            } else {
                logger.error(`User creation failed. Default '${DEFAULT_ROLE}' role does not exist.`);
                next(new Error(`User creation failed. Default '${DEFAULT_ROLE}' role does not exist.`));
                res.status(500).json({ message: 'default "${DEFAULT_ROLE}" role does not exist' });
                return;
            }

            // Append the default role to the newUser object
            newUser.roles = [{ role: defaultRole }];
        }

        logger.info(`User ${newUser.username} created successfully`)
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

/**
 * Updates a user by its ID. Only the requesting user can update their own data. Admins can update any user.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 *
 * @throws {400} - If at least one field is not provided in the request body
 * @throws {403} - If the requesting user is not an admin and is trying to update a user other than themselves
 * @throws {404} - If the user with the provided ID does not exist
 * @throws {500} - If an error occurs while updating the user
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const id_of_user_to_update = id;
    
    const parseResult = updateUserSchema.safeParse(req.body);

    if (!parseResult.success) {
        logger.warn("User update failed. Invalid request body. \nError: " + parseResult.error.errors[0].message);
        res.status(400).json({ message: parseResult.error.errors[0].message });
        return;
    }

    const { email, username, password, role_name } = parseResult.data;

    const authenticatedUser = req.user as any;
    const user = await prisma.users.findUnique({ where: { id: authenticatedUser.id } });

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
                logger.info(`User with id ${id_of_user_to_update} is updating their own password.`);

                // Check if the authenticated user is an admin
            } else if(authenticatedUser.roles.every((role: any) => role.role.name === 'admin')) {
                userUpdateData.password = await hashPassword(password);
                logger.info(`User with id ${authenticatedUser.id} is an admin and is updating the password of user with id ${id_of_user_to_update}.`);

            } else {
                logger.warn(`User update failed. Requesting user does not have permission to update this user. The user with id ${authenticatedUser.id} is trying to change the password of user with id ${id_of_user_to_update}.`);
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
                roles: {
                    select: {
                        role: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
            }
        });

        logger.info(`User ${updatedUser.username} updated successfully`)
        res.json(updatedUser);
        return;
    } catch (error) {
        if ((error as any).code === 'P2025') {
            // Record not found
            logger.warn(`User update failed. User with id ${id} not found.`);
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

/**
 * Soft delete a user by setting the deletedAt timestamp to the current time.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 *
 * @throws {400} - If the user is already deleted
 * @throws {404} - If the user is not found
 * @throws {500} - If there is an error while deleting the user
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {

        const user = await prisma.users.findUnique({
            where: { id }
        });

        if (!user) {
            logger.warn(`User delete failed. User with id ${id} not found.`);
            res.status(404).json({ message: 'User not found' });
            return;
        } else if (user.deletedAt) {
            logger.warn(`User delete failed. User with id ${id} is already deleted.`);
            res.status(400).json({ message: 'User is already deleted' });
            return;
        }

        await prisma.users.update({
            where: { id },
            data: { deletedAt: new Date() } // Mark user as deleted by setting the timestamp
        });

        logger.info(`User with id ${id} deleted successfully`);
        res.json({ message: 'User deleted successfully' });
        return;
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Encountered some error while deleting user' });
        return;
    }
};

/**
 * Restore a soft-deleted user (Admin only).
 * 
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {400} - If the user is not soft-deleted
 * @throws {404} - If the user is not found
 * @throws {500} - If there is an error while restoring the user
 */
export const restoreUser = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        // Ensure the user is currently soft-deleted
        const user = await prisma.users.findUnique({
            where: { id }
        });

        if (!user) {
            logger.warn(`User restore failed. User with id ${id} not found.`);
            res.status(404).json({ message: 'User not found' });
            return;
        } else if (!user.deletedAt) {
            logger.warn(`User restore failed. User with id ${id} is not soft-deleted.`);
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

/**
 * Permanently delete a user by its ID. This will delete all associated records (e.g. user roles, providers).
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 *
 * @throws {404} - If the user is not found
 * @throws {500} - If there is an error while permanently deleting the user
 */
export const permanentlyDeleteUser = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        const user = await prisma.users.findUnique({
            where: { id },
        });

        if (!user) {
            logger.warn(`User permanent deletion failed. User with id ${id} not found.`);
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
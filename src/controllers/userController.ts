import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma'; // Import Prisma client
import { hashPassword } from '../utils/passwordHash';
import logger from '../services/logger';
import { registerUserSchema, updateUserSchema, validateUserRequest } from '../models/userModel';
import { DEFAULT_ROLE } from '../utils/constants';

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
        next({ message: 'Encountered some error while retrieving users', error});
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
        next({ message: 'Encountered some error while retrieving all users', error});
    }
};

/**
 * Retrieves a user by its ID.
 * 
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {400} - If the user ID format is invalid
 * @throws {404} - If the user is not found
 * @throws {500} - If there is an error while retrieving the user
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const userId = validateUserRequest(id, null, null);

    try {
        const user = await prisma.users.findUnique({
            where: { id: userId, deletedAt: null }, // Ensure the user isn’t soft deleted
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
            logger.warn(`User with user ID '${userId}' not found. The user may be soft-deleted.`)
            res.status(404).json({ message: 'User not found' });
            return;
        }

        logger.info(`User '${user.username}' fetched successfully`)
        res.json(user);
        return;
    } catch (error) {
        if ((error as any).status){
            res.status((error as any).status).json({ message: (error as any).message });
            return;
        }
        next({ message: 'Encountered some error while retrieving user with the provided ID', error});
    }
};

/**
 * Retrieves a user by their ID. This includes soft-deleted users.
 * 
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {400} - If the user ID format is invalid
 * @throws {404} - If the user is not found
 * @throws {500} - If there is an error while retrieving the user
 */
export const getUserByIdIncludingDeleted = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const userId = validateUserRequest(id, null, null);

    try {
        const user = await prisma.users.findUnique({
            where: { id: userId },
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
            logger.warn(`User with user ID '${userId}' not found`)
            res.status(404).json({ message: 'User not found' });
            return;
        }

        logger.info(`User '${user.username}' fetched successfully`)
        res.json(user);
        return;
    } catch (error) {
        if ((error as any).status){
            res.status((error as any).status).json({ message: (error as any).message });
            return;
        }
        next({ message: 'Encountered some error while retrieving user with the provided ID', error});
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
 * @throws {404} - If the provided role is not found
 * @throws {409} - If the user already exists
 * @throws {500} - If an error occurs while creating the user
 */
export const createUser = async (req: Request, res: Response, next: NextFunction) => {

    const { email, username, password, role_name } = validateUserRequest(null, req.body, registerUserSchema);

    try {
        // Check if the user already exists
        const user = await prisma.users.findUnique({ where: { email } });

        if(user){
            logger.warn("User creation failed. User already exists with email address: " + email);
            res.status(409).json({ message: "User already exists with provided email address." });
            return;
        }

        // Check if the role exists
        const role = await prisma.roles.findUnique({ where: { name: role_name } });

        if (!role) {
            if (role_name === DEFAULT_ROLE) {
                throw new Error("Default role '" + role_name + "' not found.");
            }

            logger.warn(`User creation failed. Role '${role_name}' does not exist.`);
            res.status(404).json({ message: 'Role does not exist' });
            return;
        }

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

        // Connect the role to the user
        if (role.id) {
            await prisma.user_role.create({
                data: {
                    userId: newUser.id,
                    roleId: role.id
                }
            });
        }

        // Append the role to the newUser object
        newUser.roles = [{ role: role }];

        logger.info(`User '${newUser.username}' created successfully`)
        res.status(201).json(newUser);
        return;
    } catch (error) {
        if ((error as any).status){
            res.status((error as any).status).json({ message: (error as any).message });
            return;
        }
        next({ message: 'Encountered some error while creating user', error});
    }
};

/**
 * Updates a user by its ID. Only the requesting user can update their own data. Admins can update any user.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 *
 * @throws {400} - If the request body is invalid or the user ID format is invalid
 * @throws {403} - If the requesting user is not an admin and is trying to update a user other than themselves
 * @throws {404} - If the user with the provided ID or the provided role does not exist
 * @throws {500} - If an error occurs while updating the user
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const { email, username, password, role_name } = validateUserRequest(id, req.body, updateUserSchema);

    const authenticatedUser = req.user as any;
    const user = await prisma.users.findUnique({ where: { id: authenticatedUser.id } });

    try {
        // Check if the user exists
        const userToUpdate = await prisma.users.findUnique({ where: { id } });

        if (!userToUpdate) {
            logger.warn(`User update failed. User with id '${id}' not found.`);
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const userUpdateData: any = {};

        if(username){
            userUpdateData.username = username;
        }

        if(email){
            userUpdateData.email = email;
        }

        if(password){
            if (id === user?.id) {
                userUpdateData.password = await hashPassword(password);
                logger.info(`User with id '${id}' is updating their own password.`);

            // Check if the authenticated user is an admin
            } else if(authenticatedUser.roles.every((role: any) => role.role.name === 'admin')) {
                userUpdateData.password = await hashPassword(password);
                logger.info(`User with id '${authenticatedUser.id}' is an admin and is updating the password of user with id '${id}'.`);

            } else {
                logger.warn(`User update failed. Requesting user does not have permission to update this user. The user with id '${authenticatedUser.id}' is trying to change the password of user with id '${id}'.`);
                res.status(403).json({ message: 'You do not have permission to update this user. You can only change your own password. Please contact an admin for additional help.' });
                return;
            }
        }

        // If a new roleName is provided, find the role and connect it
        if (role_name) {
            const role = await prisma.roles.findUnique({ where: { name: role_name } });

            if (!role) {
                if (role_name === DEFAULT_ROLE) {
                    throw new Error("Default role '" + role_name + "' not found.");
                }
                logger.warn(`User update failed. Role '${role_name}' does not exist.`);
                res.status(404).json({ message: 'Role does not exist' });
                return;
            }

            //Check if the user is already connected to a role
            const userRole = await prisma.user_role.findFirst({
                where: {
                    userId: id,
                    roleId: role.id
                }
            });

            if (userRole) {
                userUpdateData.roleId = role.id; // Update the role

            } else if (role.id) {
                await prisma.user_role.create({
                    data: {
                        userId: id,
                        roleId: role.id
                    }
                });
            }
        }

        const updatedUser = await prisma.users.update({
            where: { id },
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

        logger.info(`User '${updatedUser.username}' updated successfully`)
        res.json(updatedUser);
        return;
    } catch (error) {
        if ((error as any).status){
            res.status((error as any).status).json({ message: (error as any).message });
            return;
        }
        next({ message: 'Encountered some error while updating user', error });
    }
};

/**
 * Soft delete a user by setting the deletedAt timestamp to the current time.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 *
 * @throws {400} - If the user ID format is invalid or the user is already deleted
 * @throws {404} - If the user is not found
 * @throws {500} - If there is an error while deleting the user
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {

        const userId = validateUserRequest(id, null, null);

        const user = await prisma.users.findUnique({
            where: { id: userId }
        });

        if (!user) {
            logger.warn(`User delete failed. User with id '${userId}' not found.`);
            res.status(404).json({ message: 'User not found' });
            return;
        } else if (user.deletedAt) {
            logger.warn(`User delete failed. User with id '${userId}' is already deleted.`);
            res.status(400).json({ message: 'User is already deleted' });
            return;
        }

        await prisma.users.update({
            where: { id: userId },
            data: { deletedAt: new Date() } // Mark user as deleted by setting the timestamp
        });

        logger.info(`User with id '${userId}' deleted successfully`);
        res.json({ message: 'User deleted successfully' });
        return;
    } catch (error) {
        if ((error as any).status){
            res.status((error as any).status).json({ message: (error as any).message });
            return;
        }
        next({ message: 'Encountered some error while deleting user', error });
    }
};

/**
 * Restore a soft-deleted user (Admin only).
 * 
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {400} - If the user ID format is invalid or the user is not soft-deleted
 * @throws {404} - If the user is not found
 * @throws {500} - If there is an error while restoring the user
 */
export const restoreUser = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        const userId = validateUserRequest(id, null, null);

        // Ensure the user is currently soft-deleted
        const user = await prisma.users.findUnique({
            where: { id: userId }
        });

        if (!user) {
            logger.warn(`User restore failed. User with id '${userId}' not found.`);
            res.status(404).json({ message: 'User not found' });
            return;
        } else if (!user.deletedAt) {
            logger.warn(`User restore failed. User with id '${userId}' is not soft-deleted.`);
            res.status(400).json({ message: 'User is not soft-deleted' });
            return;
        }

        // Restore the user by setting deletedAt to null
        await prisma.users.update({
            where: { id },
            data: { deletedAt: null }
        });

        logger.info(`User with id '${userId}' restored successfully`);
        res.json({ message: 'User restored successfully' });
        return;
    } catch (error) {
        if ((error as any).status){
            res.status((error as any).status).json({ message: (error as any).message });
            return;
        }
        next({ message: 'Encountered some error while restoring user', error });
    }
};

/**
 * Permanently delete a user by its ID. This will delete all associated records (e.g. user roles, providers).
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 *
 * @throws {400} - If the user ID format is invalid
 * @throws {404} - If the user is not found
 * @throws {500} - If there is an error while permanently deleting the user
 */
export const permanentlyDeleteUser = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        const userId = validateUserRequest(id, null, null);

        const user = await prisma.users.findUnique({
            where: { id: userId },
        });

        if (!user) {
            logger.warn(`User permanent deletion failed. User with id '${userId}' not found.`);
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

        logger.info(`User with id '${userId}' permanently deleted successfully`);
        res.json({ message: 'User permanently deleted successfully' });
        return;
    } catch (error) {
        if ((error as any).status){
            res.status((error as any).status).json({ message: (error as any).message });
            return;
        }
        next({ message: 'Encountered some error while permanently deleting user', error });
    }
};

/**
 * Permanently delete multiple users by their IDs. This will delete all associated records (e.g. user roles, providers).
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 *
 * @throws {400} - If no user IDs or emails are provided
 * @throws {404} - If one or more users are not found
 * @throws {500} - If there is an error while permanently deleting the users
 */
export const bulkPermanentlyDeleteUsers = async (req: Request, res: Response, next: NextFunction) => {
    const { userIds, emails, emailPattern } = req.body;

    if ((!Array.isArray(userIds) || userIds.length === 0) && 
        (!Array.isArray(emails) || emails.length === 0) && 
        !emailPattern) {
        logger.warn(`Bulk permanent deletion failed. No user IDs or emails provided.`);
        res.status(400).json({ message: 'No user IDs or emails provided' });
        return;
    }

    try {
        let users;

        if (Array.isArray(userIds) && userIds.length > 0) {
            // Check if all users exist by IDs
            users = await prisma.users.findMany({
                where: { id: { in: userIds } },
            });

            if (users.length !== userIds.length) {
                logger.warn(`Bulk permanent deletion failed. One or more users not found by IDs.`);
                res.status(404).json({ message: 'One or more users not found by IDs' });
                return;
            }
        } else if (Array.isArray(emails) && emails.length > 0) {
            // Check if all users exist by emails
            users = await prisma.users.findMany({
                where: { email: { in: emails } },
            });

            if (users.length !== emails.length) {
                logger.warn(`Bulk permanent deletion failed. One or more users not found by emails.`);
                res.status(404).json({ message: 'One or more users not found by emails' });
                return;
            }
        } else if (emailPattern) {
            // Check if users exist by email pattern
            users = await prisma.users.findMany({
                where: { email: { contains: emailPattern } },
            });

            if (users.length === 0) {
                logger.warn(`Bulk permanent deletion failed. No users found matching the email pattern.`);
                res.status(404).json({ message: 'No users found matching the email pattern' });
                return;
            }
        }

        const userIdsToDelete = users?.map(user => user.id);

        // Delete the providers associated with the users
        await prisma.user_provider.deleteMany({
            where: { userId: { in: userIdsToDelete } },
        });

        // Ensure the users are freed of any roles
        await prisma.user_role.deleteMany({
            where: { userId: { in: userIdsToDelete } },
        });

        // Permanently delete the users
        await prisma.users.deleteMany({
            where: { id: { in: userIdsToDelete } },
        });

        logger.info(`Users with IDs '${userIdsToDelete?.join(', ')}' permanently deleted successfully`);
        res.json({ message: 'Users permanently deleted successfully' });
        return;
    } catch (error) {
        next({ message: 'Encountered some error while permanently deleting users', error });
    }
};
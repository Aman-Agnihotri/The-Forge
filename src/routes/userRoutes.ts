import { Router } from "express";
import {
    getAllUsers,
    getAllUsersIncludingDeleted,
    getUserById,
    getUserByIdIncludingDeleted,
    createUser,
    updateUser,
    deleteUser,
    restoreUser,
    permanentlyDeleteUser
} from "../controllers/userController";
import { authorizeRoles } from "../middlewares/roleMiddleware";
import logger from "../services/logger";

const router = Router();

// Middleware to log requests
router.use((req, res, next) => {
    logger.info(`Received ${req.method} request for ${req.url}`);
    next();
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only).
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of all users.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   username:
 *                     type: string
 *                   email:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                   updatedAt:
 *                     type: string
 *                   roles:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         role:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                   providers:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         providerName:
 *                           type: string
 *                         providerId:
 *                           type: string
 *       500:
 *         description: Error retrieving users.
 */
router.get('/', authorizeRoles(['admin']), (req, res, next) => {
    logger.info('Fetching all users...');
    next();
}, getAllUsers);

/**
 * @swagger
 * /api/users/all:
 *   get:
 *     summary: Get all users, including soft deleted (Admin only).
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of all users, including soft deleted.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   username:
 *                     type: string
 *                   email:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                   updatedAt:
 *                     type: string
 *                   deletedAt:
 *                     type: string
 *                   roles:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         role:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                   providers:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         providerName:
 *                           type: string
 *                         providerId:
 *                           type: string
 *       500:
 *         description: Error retrieving users.
 */
router.get('/all', authorizeRoles(['admin']), (req, res, next) => {
    logger.info('Fetching all users including deleted...');
    next();
}, getAllUsersIncludingDeleted);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a user by ID.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID.
 *     responses:
 *       200:
 *         description: The user data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 roles:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         role:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                 providers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       providerName:
 *                         type: string
 *       404:
 *         description: User not found.
 *       500:
 *         description: Error retrieving user.
 */
router.get('/:id', authorizeRoles(['admin', 'user']), (req, res, next) => {
    logger.info(`Fetching user by ID: ${req.params.id}`);
    next();
}, getUserById);

/**
 * @swagger
 * /api/users/all/{id}:
 *   get:
 *     summary: Get a user by ID, including soft deleted users (Admin only).
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID.
 *     responses:
 *       200:
 *         description: The user data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                 updatedAt:
 *                   type: string
 *                 deletedAt:
 *                   type: string
 *                 roles:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         role:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                 providers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       providerName:
 *                         type: string
 *                       providerId:
 *                         type: string
 *       404:
 *         description: User not found.
 *       500:
 *         description: Error retrieving user.
 */
router.get('/all/:id/', authorizeRoles(['admin']), (req, res, next) => {
    logger.info(`Fetching user by ID including deleted: ${req.params.id}`);
    next();
}, getUserByIdIncludingDeleted);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user (Admin only).
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role_name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 roles:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         role:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *       400:
 *         description: Invalid input.
 *       500:
 *         description: Error creating user.
 */
router.post('/', authorizeRoles(['admin']), (req, res, next) => {
    logger.info('Creating a new user...');
    next();
}, createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update a user.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 roles:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         role:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *       400:
 *         description: Invalid input.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Error updating user.
 */
router.put('/:id', authorizeRoles(['admin', 'user']), (req, res, next) => {
    logger.info(`Updating user by ID: ${req.params.id}`);
    next();
}, updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Soft delete a user (Admin only).
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID.
 *     responses:
 *       200:
 *         description: User deleted successfully.
 *       400:
 *         description: User is already deleted.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Error deleting user.
 */
router.delete('/:id', authorizeRoles(['admin']), (req, res, next) => {
    logger.info(`Soft deleting user by ID: ${req.params.id}`);
    next();
}, deleteUser);

/**
 * @swagger
 * /api/users/restore/{id}:
 *   put:
 *     summary: Restore a soft-deleted user (Admin only).
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID.
 *     responses:
 *       200:
 *         description: User restored successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: User is not soft-deleted.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Error restoring user.
 */
router.put('/restore/:id', authorizeRoles(['admin']), (req, res, next) => {
    logger.info(`Restoring user by ID: ${req.params.id}`);
    next();
}, restoreUser);

/**
 * @swagger
 * /api/users/permanent/{id}:
 *   delete:
 *     summary: Permanently delete a user (Admin only).
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID.
 *     responses:
 *       200:
 *         description: User permanently deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: User not found.
 *       500:
 *         description: Error permanently deleting user.
 */
router.delete('/permanent/:id', authorizeRoles(['admin']), (req, res, next) => {
    logger.info(`Permanently deleting user by ID: ${req.params.id}`);
    next();
}, permanentlyDeleteUser);

export default router;
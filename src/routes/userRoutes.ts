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

// Get all users (Admin only)
router.get('/', authorizeRoles(['admin']), (req, res, next) => {
    logger.info('Fetching all users');
    next();
}, getAllUsers);

// Get all users, including soft deleted (Admin only)
router.get('/all', authorizeRoles(['admin']), (req, res, next) => {
    logger.info('Fetching all users including deleted');
    next();
}, getAllUsersIncludingDeleted);

// Get user by ID
router.get('/:id', authorizeRoles(['admin', 'user']), (req, res, next) => {
    logger.info(`Fetching user by ID: ${req.params.id}`);
    next();
}, getUserById);

// Get user by ID, including soft deleted users (Admin only)
router.get('/all/:id/', authorizeRoles(['admin']), (req, res, next) => {
    logger.info(`Fetching user by ID including deleted: ${req.params.id}`);
    next();
}, getUserByIdIncludingDeleted);

// Create a new user (Admin only)
router.post('/', authorizeRoles(['admin']), (req, res, next) => {
    logger.info('Creating a new user');
    next();
}, createUser);

// Update user information
router.put('/:id', authorizeRoles(['admin', 'user']), (req, res, next) => {
    logger.info(`Updating user by ID: ${req.params.id}`);
    next();
}, updateUser);

// Soft delete a user (Admin only)
router.delete('/:id', authorizeRoles(['admin']), (req, res, next) => {
    logger.info(`Soft deleting user by ID: ${req.params.id}`);
    next();
}, deleteUser);

// Restore a soft deleted user (Admin only)
router.put('/:id/restore', authorizeRoles(['admin']), (req, res, next) => {
    logger.info(`Restoring user by ID: ${req.params.id}`);
    next();
}, restoreUser);

// Permanently delete a user (Admin only)
router.delete('/:id/permanently', authorizeRoles(['admin']), (req, res, next) => {
    logger.info(`Permanently deleting user by ID: ${req.params.id}`);
    next();
}, permanentlyDeleteUser);

export default router;
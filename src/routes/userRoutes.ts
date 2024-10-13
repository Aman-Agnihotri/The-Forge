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
import { authenticateUser } from "../middlewares/authMiddleware";
import { authorizeRoles } from "../middlewares/roleMiddleware";

const router = Router();

// Apply authentication middleware to all user routes
router.use(authenticateUser);

// Get all users (Admin only)
router.get('/',authorizeRoles(['admin']), getAllUsers);

// Get all users, including soft deleted (Admin only)
router.get('/all', authorizeRoles(['admin']), getAllUsersIncludingDeleted);

// Get user by ID
router.get('/:id', authorizeRoles(['admin', 'user']), getUserById);

// Get user by ID, including soft deleted users (Admin only)
router.get('/all/:id/', authorizeRoles(['admin']), getUserByIdIncludingDeleted);

// Create a new user (Admin only)
router.post('/', authorizeRoles(['admin']), createUser);

// Update user information
router.put('/:id', authorizeRoles(['admin', 'user']), updateUser);

// Soft delete a user (Admin only)
router.delete('/:id', authorizeRoles(['admin']), deleteUser);

// Restore a soft deleted user (Admin only)
router.put('/:id/restore`', authorizeRoles(['admin']), restoreUser);

// Permanently delete a user (Admin only)
router.delete('/:id/permanently', authorizeRoles(['admin']), permanentlyDeleteUser);

export default router;
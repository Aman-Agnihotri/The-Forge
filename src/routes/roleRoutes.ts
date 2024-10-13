import { Router } from 'express';
import { 
    createRole, 
    getAllRoles,
    getRoleById,
    updateRole,
    deleteRole
} from '../controllers/roleController';
import { authenticateUser } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Create a new role (Admin only)
router.post('/', authorizeRoles(['admin']), createRole);

// Get all roles (Admin only)
router.get('/', authorizeRoles(['admin']), getAllRoles);

// Get role by ID (Admin only)
router.get('/:id', authorizeRoles(['admin']), getRoleById);

// Update a role (Admin only)
router.put('/:id', authorizeRoles(['admin']), updateRole);

// Delete a role (Admin only)
router.delete('/:id', authorizeRoles(['admin']), deleteRole);

export default router;

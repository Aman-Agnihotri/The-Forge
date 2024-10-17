import { Router } from 'express';
import { 
    createRole, 
    getAllRoles,
    getRoleById,
    updateRole,
    deleteRole
} from '../controllers/roleController';
import { authorizeRoles } from '../middlewares/roleMiddleware';
import logger from '../services/logger';

const router = Router();

// Middleware to log requests
router.use((req, res, next) => {
    logger.info(`Received ${req.method} request for ${req.url}`);
    next();
});

// Create a new role (Admin only)
router.post('/', authorizeRoles(['admin']), (req, res, next) => {
    logger.info('Creating a new role');
    createRole(req, res, next);
});

// Get all roles (Admin only)
router.get('/', authorizeRoles(['admin']), (req, res, next) => {
    logger.info('Fetching all roles');
    getAllRoles(req, res, next);
});

// Get role by ID (Admin only)
router.get('/:id', authorizeRoles(['admin']), (req, res, next) => {
    logger.info(`Fetching role with ID: ${req.params.id}`);
    getRoleById(req, res, next);
});

// Update a role (Admin only)
router.put('/:id', authorizeRoles(['admin']), (req, res, next) => {
    logger.info(`Updating role with ID: ${req.params.id}`);
    updateRole(req, res, next);
});

// Delete a role (Admin only)
router.delete('/:id', authorizeRoles(['admin']), (req, res, next) => {
    logger.info(`Deleting role with ID: ${req.params.id}`);
    deleteRole(req, res, next);
});

export default router;

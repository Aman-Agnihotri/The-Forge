import { Router } from 'express';
import { 
    createRole,
    getAllRoles,
    getRoleById,
    updateRole,
    deleteRole
} from '../controllers/roleController';
import { authorizeRoles } from '../middlewares/roleMiddleware';
import { validateRoleBody, validateIdParam } from '../middlewares/validationMiddleware'; 
import logger from '../services/logger';

const router = Router();

// Middleware to log requests
router.use((req, res, next) => {
    logger.debug(`Received ${req.method} request for ${req.url}`);
    next();
});

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles (Admin only).
 *     tags: [Roles]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of all roles.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   users:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *       401:
 *         description: Unauthorized access.
 *       403:
 *         description: Forbidden access.
 *       429:
 *         description: Too many requests (rate-limited).
 *       500:
 *         description: Error retrieving roles.
 */
router.get('/', authorizeRoles(['admin']), getAllRoles);

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Get a role by its ID (Admin only).
 *     tags: [Roles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The role ID.
 *     responses:
 *       200:
 *         description: The role data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       username:
 *                         type: string
 *       400:
 *         description: Invalid role ID format.
 *       401:
 *         description: Unauthorized access.
 *       403:
 *         description: Forbidden access.
 *       404:
 *         description: Role not found.
 *       429:
 *         description: Too many requests (rate-limited).
 *       500:
 *         description: Error retrieving role.
 */
router.get('/:id', authorizeRoles(['admin']), validateIdParam, getRoleById);

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Create a new role (Admin only).
 *     tags: [Roles]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Role created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *       400:
 *         description: Invalid request body.
 *       401:
 *         description: Unauthorized access.
 *       403:
 *         description: Forbidden access.
 *       429:
 *         description: Too many requests (rate-limited).
 *       500:
 *         description: Error creating role.
 */
router.post('/', authorizeRoles(['admin']), validateRoleBody, createRole);

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     summary: Update a role (Admin only).
 *     tags: [Roles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The role ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *       400:
 *         description: Invalid ID format or invalid request body.
 *       401:
 *         description: Unauthorized access.
 *       403:
 *         description: Forbidden access.
 *       404:
 *         description: Role not found.
 *       409:
 *         description: Role with the updated name already exists.
 *       429:
 *         description: Too many requests (rate-limited).
 *       500:
 *         description: Error updating role.
 */
router.put('/:id', authorizeRoles(['admin']), validateIdParam, validateRoleBody, updateRole);

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Delete a role (Admin only).
 *     tags: [Roles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The role ID.
 *     responses:
 *       200:
 *         description: Role deleted successfully.
 *       400:
 *         description: Invalid ID format.
 *       401:
 *         description: Unauthorized access.
 *       403:
 *         description: Forbidden access.
 *       404:
 *         description: Role not found.
 *       429:
 *         description: Too many requests (rate-limited).
 *       500:
 *         description: Error deleting role.
 */
router.delete('/:id', authorizeRoles(['admin']), validateIdParam, deleteRole);

export default router;
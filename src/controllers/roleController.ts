import { Request, Response, NextFunction } from 'express';
import { roleService } from '../services/roleService';
import logger from '../utils/logger';

/**
 * Retrieves all roles with their associated users.
 * 
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {500} - If there is an error while retrieving the roles
 */
export const getAllRoles = async (req: Request, res: Response, next: NextFunction) => {
    const username = (req as any).user?.username || 'Unknown User';
    logger.debug(`User '${username}' is fetching all roles...`);

    try {
        const roles = await roleService.getAllRoles();

        logger.debug(`User '${username}' fetched all roles.`);
        res.json({ success: true, roles });
        return;
    } catch (error) {
        next({message: 'Encountered some error while retrieving roles.', error});
    }
};

/**
 * Retrieves a role by its ID.
 * 
 * @param {Request} req - The request object containing the role ID in params
 * @param {Response} res - The response object to send the role data or error message
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {400} - If the role ID format is invalid
 * @throws {404} - If the role is not found
 * @throws {500} - If there is an error while retrieving the role
 */
export const getRoleById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const username = (req as any).user?.username || 'Unknown User';
    logger.debug(`User '${username}' is fetching role with id '${id}'...`);

    try {
        const role = await roleService.getRoleById(id);

        if (!role) {
            logger.info(`Role with id '${id}' not found. User '${username}' attempted to fetch it.`);
            res.status(404).json({ success: false, message: 'Role not found.' });
            return;
        }

        logger.debug(`User '${username}' successfully fetched role with ID '${id}'.`);
        res.json({ success: true, role });
        return;
    } catch (error) {
        next({ message: "Encountered some error while retrieving role.", error });
    }
};

/**
 * Creates a new role.
 * 
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 * 
 * @throws {400} - If the request body is invalid
 * @throws {409} - If a role with the same name already exists
 * @throws {500} - If an error occurs while creating the role
 */
export const createRole = async (req: Request, res: Response, next: NextFunction) => {
    const username = (req as any).user?.username || 'Unknown User';
    logger.debug(`User '${username}' is attempting to creating a new role...`);

    const { name } = req.body;
    logger.debug(`User '${username}' is creating role with name '${name}'.`);

    try {

        // Check if the role already exists
        const existingRole = await roleService.getRoleByName(name);

        if (existingRole) {
            logger.info(`Role creation failed. Role with name '${name}' already exists. User '${username}' attempted to create it.`);
            res.status(409).json({ success: false, message: 'Role already exists.' });
            return;
        }

        const newRole = await roleService.createRole(name);

        logger.debug(`User '${username}' successfully created role '${newRole.name}' with ID '${newRole.id}'.`);

        res.status(201).json({ success: true, newRole });
        return;
    } catch (error) {
        next({message: 'Encountered some error while creating role.', error});
    }
};

/**
 * Updates a role by its ID. Only admins can update roles.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 *
 * @throws {400} - If the request body is invalid or the role ID is invalid
 * @throws {404} - If the role with the provided ID does not exist
 * @throws {500} - If an error occurs while updating the role
 */
export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
    const username = (req as any).user?.username || 'Unknown User';
    const { id } = req.params;

    logger.debug(`User '${username}' is attempting to update role with ID '${id}'...`);

    const { name } = req.body;
    logger.debug(`User '${username}' is updating role with ID '${id}' to have name '${name}'.`);

    try {
        // Check if the role exists
        const role = await roleService.getRoleById(id);

        if (!role) {
            logger.info(`Role update failed. Role with id '${id}' not found. User '${username}' attempted to update it.`);
            res.status(404).json({ success: false, message: 'Role not found.' });
            return;
        }

        if (role.name === name) {
            logger.info(`Role update failed. New name is the same as the current name for role ID '${id}'. User '${username}' attempted to update it.`);
            res.status(400).json({ success: false, message: 'Role name is the same as before.' });
            return;
        }

        const existingRole = await roleService.getRoleByName(name);

        if (existingRole) {
            logger.info(`Role update failed. Role with name '${name}' already exists. User '${username}' attempted to rename role ID '${id}' to it.`);
            res.status(409).json({ success: false, message: 'Role already exists.' });
            return;
        }

        const updatedRole = await roleService.updateRole(id, name);

        logger.debug(`User '${username}' successfully updated role with ID '${id}' to name '${name}'.`);
        res.json({ success: true, updatedRole });
        return;
    } catch (error) {
        next({ message: "Encountered some error while updating role.", error });
    }
};

/**
 * Deletes a role by its ID. Only admins can delete roles.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 *
 * @throws {400} - If the role ID format is invalid
 * @throws {404} - If the role with the provided ID does not exist
 * @throws {500} - If an error occurs while deleting the role
 */
export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const username = (req as any).user?.username || 'Unknown User';
    logger.debug(`User '${username}' is attempting to delete role with ID '${id}'...`);

    try {

        const role = await roleService.getRoleById(id);

        if (!role) {
            logger.info(`Role deletion failed. Role with id '${id}' not found. User '${username}' attempted to delete it.`);
            res.status(404).json({ success: false, message: 'Role not found.' });
            return;
        }
        
        // Disconect all users from the role and then delete the role
        const { disconnectedUsersCount, deletedRole } = await roleService.deleteRole(id);

        logger.debug(`Disconnected ${disconnectedUsersCount} users from role ID '${id}' before deletion.`);
            
        logger.debug(`User '${username}' successfully deleted role '${deletedRole.name}' with ID '${id}'.`);
        res.json({ success: true, message: 'Role deleted successfully.' });
        return;
    } catch (error) {
        next({ message: "Encountered some error while deleting role.", error });
    }
};
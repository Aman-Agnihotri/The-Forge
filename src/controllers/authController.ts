import { NextFunction, Request, Response } from "express";
import { generateToken } from "../utils/jwt";
import { hashPassword, verifyPassword } from "../utils/passwordHash";
import { registerUserSchema, loginUserSchema } from "../models/userModel";
import { prisma } from "../config/prisma";
import logger from "../services/logger";

/**
 * Register a new user.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 *
 * @returns {Promise<any>} A promise that resolves with the JWT and the user object.
 *
 * @throws {400} - The request body is invalid
 * @throws {409} - A user with the same email already exists
 * @throws {500} - An error occurred while registering user
 */
export const registerUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const parseResult = registerUserSchema.safeParse(req.body);

    if (!parseResult.success) {
        logger.warn("User registration failed. Invalid request body.\nError: " + parseResult.error.errors[0].message);
        return res.status(400).json({ message: parseResult.error.errors[0].message });
    }
    
    const { username, email, password, role_name } = parseResult.data;

    try{
        //Check if the user already exists
        const user = await prisma.users.findUnique({ where: { email } });
        if(user){
            logger.warn(`User already exists with email '${email}'.`);
            return res.status(409).json({ message: "User already exists with provided email address." });
        }

        // Check if the role exists
        const role = await prisma.roles.findUnique({ where: { name: role_name } });

        if (!role) {
            logger.warn(`User registration failed. Role '${role_name}' does not exist.`);
            return res.status(400).json({ message: 'Role does not exist' });
        }

        //Create a new user and hash the password
        const newUser = await prisma.users.create({
            data: {
                username,
                email,
                password: await hashPassword(password)
            }
        });

        // Connect the role to the user
        if (role?.id) {
            await prisma.user_role.create({
                data: {
                    userId: newUser.id,
                    roleId: role.id
                }
            });
        }

        //Generate a JWT for the new user
        const token = generateToken(newUser.id);

        // Remove all fields from the user object except username and id before returning
        const filteredUserData = { id: newUser.id, username: newUser.username };

        // Log the successful registration
        logger.info(`User '${username}' registered successfully with email '${email}'.`);

        // Return the JWT and the user object
        return res.status(201).json({ token, user: filteredUserData });
    } catch (error) {
        logger.error(error);
        next(error);
        return res.status(500).json({ message: "An error occurred while registering user." });
    }
};

/**
 * Logs in an existing user and generates a JWT for them.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next function in the middleware chain
 *
 * @returns {Promise<any>} A promise that resolves with the JWT and the user object.
 *
 * @throws {400} - The request body is invalid
 * @throws {401} - The user is not found, or the password is invalid
 * @throws {500} - An error occurred while logging in
 */
export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const parseResult = loginUserSchema.safeParse(req.body);
    
    if (!parseResult.success) {
        logger.warn("User login failed. Invalid request body.\nError: " + parseResult.error.errors[0].message);
        return res.status(400).json({ message: parseResult.error.errors[0].message });
    }

    const { email, password } = parseResult.data;

    try{
        //Check if the user exists
        const user = await prisma.users.findUnique({ where : { email } });

        if(!user){
            logger.warn(`User not found with email '${email}'.`);
            return res.status(401).json({ message: "User not found with provided email address." });
        }

        //Check if the user is soft deleted
        if(user.deletedAt){
            logger.warn(`User with email address '${email}' is soft deleted.`);
            return res.status(401).json({ message: "User not found with provided email address." });
        }

        //Verify password by comparing the hashed password
        if (user.password === null) {
            logger.warn(`A social login account with '${email}' email address already exists.`);
            return res.status(401).json({ message: "A social login account with this email address already exists." });
        }

        const validPassword = await verifyPassword(user.password, password);
        if(!validPassword){
            logger.warn(`Invalid password for user '${email}'.`);
            return res.status(401).json({ message: "Invalid password." });
        }

        //Generate a JWT for the user
        const token = generateToken(user.id);

        // Remove all fields from the user object except username and id before returning
        const filteredUserData = { id: user.id, username: user.username };

        // Log the successful login
        logger.info(`User '${user.username}' logged in successfully with email '${email}'.`);
        return res.status(200).json({ token, user: filteredUserData });
    } catch (error) {
        logger.error(error);
        next(error);
        return res.status(500).json({ message: "An error occurred while logging in." });
    }
};
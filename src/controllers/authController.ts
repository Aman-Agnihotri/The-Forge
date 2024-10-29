import { NextFunction, Request, Response } from "express";
import { 
    generateToken,
    generateRefreshToken,
    verifyRefreshToken,
    TokenExpiredError, 
    JsonWebTokenError 
} from "../utils/jwt";
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

        //Generate a refresh token for the new user
        const refreshToken = generateRefreshToken(newUser.id);

        // Remove all fields from the user object except username and id before returning
        const filteredUserData = { id: newUser.id, username: newUser.username };

        // Log the successful registration
        logger.info(`User '${username}' registered successfully with email '${email}'.`);

        // Return the JWT and the user object
        return res.status(201).json({ token, refreshToken, user: filteredUserData });
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

        //Generate a refresh token for the user
        const refreshToken = generateRefreshToken(user.id);

        // Remove all fields from the user object except username and id before returning
        const filteredUserData = { id: user.id, username: user.username };

        // Log the successful login
        logger.info(`User '${user.username}' logged in successfully with email '${email}'.`);
        return res.status(200).json({ token, refreshToken, user: filteredUserData });
    } catch (error) {
        logger.error(error);
        next(error);
        return res.status(500).json({ message: "An error occurred while logging in." });
    }
};

/**
 * Refreshes the access token using a valid refresh token.
 *
 * @param {Request} req - The request object, expected to contain a refreshToken in the body.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next middleware function in the stack.
 *
 * @returns {Promise<any>} A promise that resolves with the new access token and refresh token if successful.
 *
 * @throws {400} - If the refresh token is missing from the request body.
 * @throws {401} - If the refresh token is invalid or malformed.
 * @throws {403} - If the user associated with the refresh token is not found.
 * @throws {500} - If an error occurs during token verification or user lookup.
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        logger.warn("Refresh token request failed. Missing token.");
        return res.status(400).json({ message: "Missing token." });
    }

    try {
        const decodedRefreshToken = verifyRefreshToken(refreshToken);
        let user_id = '';

        if (typeof decodedRefreshToken !== 'string' && 'id' in decodedRefreshToken) {
            user_id = decodedRefreshToken.id;
        } else {
            logger.warn(`Invalid refresh token payload: ${JSON.stringify(decodedRefreshToken)}`);
            return res.status(401).json({ message: 'Invalid token payload' });
        }

        const user = await prisma.users.findUnique({ where: { id: user_id },
            select: { 
                id: true,
            }
        });

        if (!user) {
            logger.warn("User with ID " + user_id + " not found: ");
            return res.status(403).json({ message: 'User not found' });
        }

        const newAccessToken = generateToken(user_id);
        const newRefreshToken = generateRefreshToken(user_id);

        return res.status(200).json({ token: newAccessToken, refreshToken: newRefreshToken });
    } catch (error) {
        if (error instanceof TokenExpiredError) {
            logger.warn("Refresh token expired: " + error.message);
            next(error);
            return res.status(401).json({ message: "Token has expired" });
        } else if (error instanceof JsonWebTokenError) {
            logger.warn("Malformed refresh token: " + error.message);
            next(error);
            return res.status(401).json({ message: "Malformed token" });
        } else {
            logger.error("Refresh token verification error: " + error);
            next(error);
            return res.status(500).json({ message: "An error occurred while refreshing token." });
        }
    }
};
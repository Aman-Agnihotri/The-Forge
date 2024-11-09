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
import { DEFAULT_ROLE } from "../utils/constants";

/**
 * Register a new user.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next middleware function.
 *
 * @returns {Promise<any>} A promise that resolves with the JWT and the user object.
 *
 * @throws {400} - The request body is invalid or the role name provided does not exist.
 * @throws {404} - The role name provided does not exist.
 * @throws {409} - A user with the same email already exists.
 * @throws {500} - An error occurred while registering the user.
 */
export const registerUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const parseResult = registerUserSchema.safeParse(req.body);

    if (!parseResult.success) {
        logger.info("User registration failed. Invalid request body.\nError: " + parseResult.error.errors[0].message);
        return res.status(400).json({ message: parseResult.error.errors[0].message });
    }

    const { username, email, password, role_name } = parseResult.data;

    try{
        //Check if the user already exists
        const user = await prisma.users.findUnique({ where: { email } });
        if(user){
            logger.info("User registration failed. User already exists with email: " + email);
            return res.status(409).json({ message: "User already exists with provided email address." });
        }

        // Check if the role exists
        const role = await prisma.roles.findUnique({ where: { name: role_name } });

        if (!role) {
            if (role_name === DEFAULT_ROLE) {
                throw new Error(`Default role '${role_name}' not found.`);
            }
            logger.info("User registration failed. Role '" + role_name + "' does not exist.");
            return res.status(404).json({ message: 'Role does not exist' });
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
        if (role.id) {
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
        logger.debug(`User '${username}' registered successfully with email '${email}'.`);

        // Return the JWT and the user object
        return res.status(201).json({ token, refreshToken, user: filteredUserData });
    } catch (error) {
        next({ message: "An error occurred while registering user.", error });
    }
};

/**
 * Logs in an existing user and generates a JWT for them.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next middleware function.
 *
 * @returns {Promise<any>} A promise that resolves with the JWT and the user object.
 *
 * @throws {400} - The request body is invalid.
 * @throws {401} - Authentication failed due to invalid email or password.
 * @throws {500} - An error occurred while processing the login.
 */
export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const parseResult = loginUserSchema.safeParse(req.body);
    
    if (!parseResult.success) {
        if(parseResult.error.errors[0].message.includes("empty") || parseResult.error.errors[0].message.includes("required") || parseResult.error.errors[0].message.includes("Password") ) {
            logger.info("User login failed. Invalid request body.\nError: " + parseResult.error.errors[0].message);
            return res.status(400).json({ message: parseResult.error.errors[0].message });
        }
        logger.info("User login failed. Invalid request body.\nError: " + parseResult.error.errors[0].message);
        return res.status(400).json({ message: "Invalid email or password." });
    }

    const { email, password } = parseResult.data;

    try{
        //Check if the user exists
        const user = await prisma.users.findUnique({ where : { email } });

        if(!user){
            logger.info(`User login failed. User not found with email '${email}'.`);
            return res.status(401).json({ message: "Invalid email or password." });
        }

        //Check if the user is soft deleted
        if(user.deletedAt){
            logger.info(`User login failed. User with email address '${email}' is soft deleted.`);
            return res.status(401).json({ message: "Invalid email or password." });
        }

        //Check if the user has a password
        if (user.password === null) {
            logger.info(`User login failed. A social login account with '${email}' email address already exists.`);
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // Verify the password
        const validPassword = await verifyPassword(user.password, password);
        if(!validPassword) {
            logger.info(`User login failed. Invalid password for user '${email}'.`);
            return res.status(401).json({ message: "Invalid password." });
        }

        // Generate tokens
        const token = generateToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        // Prepare user data for response
        const filteredUserData = { id: user.id, username: user.username };

        // Log the successful login
        logger.debug(`User '${user.username}' logged in successfully with email '${email}'.`);
        return res.status(200).json({ token, refreshToken, user: filteredUserData });
    } catch (error) {
        next({ message: "An error occurred while logging in.", error });
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
 * @throws {400} - Missing refresh token in the request body.
 * @throws {401} - Invalid or expired refresh token.
 * @throws {500} - If an error occurs during token verification or user lookup.
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        logger.info("Refresh token request failed. Missing token.");
        return res.status(400).json({ message: "Missing token." });
    }

    try {
        const decodedRefreshToken = verifyRefreshToken(refreshToken);
        let user_id = '';

        if (typeof decodedRefreshToken !== 'string' && 'id' in decodedRefreshToken) {
            user_id = decodedRefreshToken.id;

            // Check if the user exists
            const user = await prisma.users.findUnique({ where: { id: user_id }, select: { id: true } });

            if (!user) {
                logger.info(`Refresh token request failed. User with ID ${user_id} not found.`);
                return res.status(401).json({ message: "Invalid or expired token." });
            }

            const newAccessToken = generateToken(user_id);

            logger.debug(`Token refreshed successfully for user with ID ${user_id}.`);
            return res.status(200).json({ token: newAccessToken });

        } else {
            logger.info(`Refresh token request failed. Invalid refresh token payload: ${JSON.stringify(decodedRefreshToken)}`);
            return res.status(401).json({ message: "Invalid or expired token." });
        }

    } catch (error) {
        if (error instanceof TokenExpiredError) {
            logger.info(`Refresh token request failed. Token expired. \nExpiredAt: ${error.expiredAt}`);
            return res.status(401).json({ message: "Invalid or expired token." });

        } else if (error instanceof Error && error.message === 'invalid signature'){
            logger.info("Refresh token request failed. Invalid token signature.");
            return res.status(401).json({ message: "Invalid or expired token." });
            
        } else if (error instanceof JsonWebTokenError) {
            logger.info("Refresh token request failed. Malformed token.");
            return res.status(401).json({ message: "Invalid or expired token." });

        } else {
            next({ message: "An error occurred while refreshing token.", error });
        }
    }
};
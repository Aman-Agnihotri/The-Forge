import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const jwt_secret = process.env.JWT_SECRET;
const jwt_expiration = process.env.JWT_EXPIRATION;

if (!jwt_secret || !jwt_expiration) {
    throw new Error("JWT_SECRET or JWT_EXPIRATION is not defined");
}

/**
 * Generates a JSON Web Token for a given user id.
 *
 * @param {string} userId - the user id for which to generate a token
 * @returns {string} a JSON Web Token that can be used to authenticate the user
 */
export const generateToken = (userId: string): string => {
    return jwt.sign({id: userId }, jwt_secret, {algorithm: "HS512" , expiresIn: jwt_expiration });
}
/**
 * Verifies a JSON Web Token. This function throws a `JsonWebTokenError` if
 * the token is invalid or has expired.
 *
 * @param {string} token - the JSON Web Token to verify
 * @throws {JsonWebTokenError} if the token is invalid or has expired
 */
export const verifyToken = (token: string) => {
    return jwt.verify(token, jwt_secret);
}
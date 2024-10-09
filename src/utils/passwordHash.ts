import argon2 from 'argon2';

/**
 * Hash a password using argon2.
 *
 * @param password - The password to be hashed
 * @returns A Promise that resolves with the hashed password
 */
export const hashPassword = async (password: string) => {
    const hashedPassword = await argon2.hash(password);
    return hashedPassword;
}

/**
 * Verify a password against a hashed password using argon2.
 *
 * @param hashedPassword - The hashed password to verify against
 * @param password - The password to verify
 * @returns A Promise that resolves with a boolean indicating whether the password is valid
 */
export const verifyPassword = async (hashedPassword: string, password: string) => {
    return await argon2.verify(hashedPassword, password);
}
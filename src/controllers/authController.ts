import { NextFunction, Request, Response } from "express";
import { generateToken } from "../utils/jwt";
import { hashPassword, verifyPassword } from "../utils/passwordHash";
import { prisma } from "../config/prisma";


export const registerUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { username, email, password } = req.body;

    try{
        //Check if the user already exists
        const user = await prisma.user.findUnique({ where: { email } });
        if(user){
            return res.status(409).json({ message: "User already exists with provided email address." });
        }

        //Create a new user and hash the password using argon2
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: await hashPassword(password)
            }
        });

        //Generate a JWT for the new user
        const token = generateToken(newUser.id);
        res.status(201).json({ token, user: newUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "An error occurred while registering the user.",
        })
}};

export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { email, password } = req.body;

    try{
        //Check if the user exists
        const user = await prisma.user.findUnique({ where : { email } });

        if(!user){
            return res.status(401).json({ message: "User not found with provided email address." });
        }

        //Verify password by comparing the hashed password
        const validPassword = await verifyPassword(user.password, password);
        if(!validPassword){
            return res.status(401).json({ message: "Invalid password." });
        }

        //Generate a JWT for the user
        const token = generateToken(user.id);
        res.status(200).json({ token, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while logging in." });
    }
};
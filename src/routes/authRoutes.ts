import { Router } from "express";
import dotenv from "dotenv";
import { prisma } from "../config/prisma";
import passport from "../config/passport";
import { generateToken, verifyToken } from "../utils/jwt";
import { loginUser, registerUser } from "../controllers/authController";
import { authenticateUser } from "../middlewares/authMiddleware";

dotenv.config();

const router = Router();

//JWT based User Login route
router.post("/login", loginUser);

//JWT based User Registration route
router.post("/register", registerUser);

//OAuth authentication routes (works for both login and linking). Just add ?linking=true to the URL for linking.
//Also, add token=yourtoken to the URL for linking, just after the ?linking=true&. The token will be used to check whether the user is authenticated to do so.
router.get("/:provider", (req, res, next) => {
    const provider = req.params.provider;
    const isLinking = req.query.linking === 'true';
    const token = req.query.token as string; // Extract the token from the query parameter

    console.log("Processing OAuth request for provider: ", provider, "isLinking: ", isLinking);

    if (isLinking && token) {

        try {
            const decodedUser = verifyToken(token);
            console.log("Token payload: ", token);

            if (typeof decodedUser !== 'string' && 'id' in decodedUser) {
                console.log("Found user: ", decodedUser.id);

            } else {
                console.log("Invalid token payload: ", decodedUser);
                res.status(401).json({ message: 'Invalid token payload' });
                return;
            }

            // Store the token in the state parameter for use in the callback
            console.log("Starting OAuth process for provider linking: ", provider, "token: ", token);

            passport.authenticate(provider, { state: token })(req, res, next);

        } catch (error) {
            console.log("Error verifying token: ", error);
            res.status(401).json({ message: 'Invalid or expired token' });
            return;
        }

    } else {
        console.log("Starting OAuth process for provider authentication: ", provider);

        passport.authenticate(provider)(req, res, next);
    }
    
});

//OAuth callback routes
router.get("/:provider/callback", (req, res, next) => {
    const provider = req.params.provider;

    console.log("Processing OAuth callback for provider: ", provider);

    passport.authenticate(provider, { session: false }, async (err: any, user: any, info: any) => {
        if(err){
            try {
                const error = JSON.parse(err);
                console.log("Error message: ", error["message"]);
                console.log("Error status: ", error["status"]);
                return res.status(error.status).send(error.message);
            } catch (e) {
                console.log("Error in parsing error message: ", e);
                return res.status(500).send("Internal Server Error");
            }
        } else if(user && 'id' in user) {
            console.log("Found user: ", user);
            let token: string;

            //If token is returned in the info parameter, reuse it. Else generate a new one
            if (info.length > 5) {
                token = info;
                console.log("Found token in callback: ", token);
            } else {
                token = generateToken(user.id as string);
            }
            
            // Ensure to sanitize user info before including in the redirect
            return res.redirect(`${process.env.FRONTEND_URL}?token=${token}&user=${JSON.stringify({ id: user.id, username: user.username })}`); // Redirect with token and user id
        } else {
            return res.status(400).send('User information is missing');
        }
    })(req, res, next);
});

//OAuth unlink route
router.delete("/unlink/:provider", authenticateUser, async (req, res) => {
    const provider = req.params.provider;
    const userId = (req as any).user.id;

    try {
        // Check if the provider is linked to the user
        const existingProvider = await prisma.user_provider.findFirst({
            where: {
                userId: userId,
                providerName: provider
            }
        });

        if (!existingProvider) {
            res.status(404).json({ message: `No linked ${provider} account found for this user.` });
            return;
        }

        // Ensure the user has another provider or email/password login
        const otherProviders = await prisma.user_provider.count({
            where: { userId: userId, providerName: { not: provider } }
        });

        const user = await prisma.users.findUnique({ where: { id: userId } });
        if (!user?.password && otherProviders === 0) {
            res.status(400).json({ message: 'Cannot unlink the last provider. Add a password or another provider before unlinking.' });
            return;
        }

        // Unlink the provider by deleting the record
        await prisma.user_provider.delete({
            where: {
                id: existingProvider.id
            }
        });

        res.json({ message: `${provider} account unlinked successfully.` });
        return;
    } catch (error) {
        console.error("Error unlinking provider:", error);
        res.status(500).json({ message: "An error occurred while unlinking the provider." });
        return;
    }
})

export default router;
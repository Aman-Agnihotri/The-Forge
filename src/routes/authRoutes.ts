import { Router } from "express";
import { loginUser, registerUser } from "../controllers/authController";
import passport from "../config/passport";
import { generateToken } from "../utils/jwt";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

//JWT based User Login route
router.post("/login", loginUser);

//JWT based User Registration route
router.post("/register", registerUser);

//Google OAuth routes
router.get('/google', 
    passport.authenticate('google', { 
        scope: ['email', 'profile'] 
    }));
router.get('/google/callback', 
    passport.authenticate('google', { session: false }), (req, res) => {
    // Generate token and send response
    if (req.user && 'id' in req.user) {
        const token = generateToken(req.user.id as number);
        res.redirect(`${process.env.FRONTEND_URL}?token=${token}&user=${JSON.stringify(req.user)}`); // Redirect with token and user id
    } else {
        res.status(400).send('User information is missing');
    }
});

//Github OAuth routes
router.get('/github', 
    passport.authenticate('github', { 
        scope: ['user:email'] 
    }));
router.get('/github/callback', 
    passport.authenticate('github', { session: false }), (req, res) => {
        // Generate token and send response
        if (req.user && 'id' in req.user) {
            const token = generateToken(req.user.id as number);
            res.redirect(`${process.env.FRONTEND_URL}?token=${token}&user=${JSON.stringify(req.user)}`); // Redirect with token and user id
        } else {
            res.status(400).send('User information is missing');
        }
    });

//Facebook OAuth routes
router.get('/facebook', 
    passport.authenticate('facebook', { 
        scope: ['email'] 
    }));
router.get('/facebook/callback',
    passport.authenticate('facebook', { session: false }), (req, res) => {
        // Generate token and send response
        if (req.user && 'id' in req.user) {
            const token = generateToken(req.user.id as number);
            res.redirect(`${process.env.FRONTEND_URL}?token=${token}&user=${JSON.stringify(req.user)}`); // Redirect with token and user id
        } else {
            res.status(400).send('User information is missing');
        }
    });

//LinkedIn OAuth routes
router.get('/linkedin', 
    passport.authenticate('linkedin', { 
        scope: ['r_emailaddress', 'r_liteprofile'] 
    }));
router.get('/linkedin/callback',
    passport.authenticate('linkedin', { session: false }), (req, res) => {
        // Generate token and send response
        if (req.user && 'id' in req.user) {
            const token = generateToken(req.user.id as number);
            res.redirect(`${process.env.FRONTEND_URL}?token=${token}&user=${JSON.stringify(req.user)}`); // Redirect with token and user id
        } else {
            res.status(400).send('User information is missing');
        }
    });

export default router;
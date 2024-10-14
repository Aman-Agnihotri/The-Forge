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
router.get('/google', passport.authenticate('google'));

router.get('/google/callback', 
    passport.authenticate('google', { session: false }), (req: any, res: any) => {
    
        if(req.user && 'id' in req.user){
            const token = generateToken(req.user.id as string);
            res.redirect(`${process.env.FRONTEND_URL}?token=${token}&user=${JSON.stringify(req.user)}`); // Redirect with token and user id
        } else {
                res.status(400).send('User information is missing');
        }
    },
        (err: any, req: any, res: any, next: any) => {
            //Handle callback errors
            if(err){
                try {
                    const error = JSON.parse(err);
                    console.log("Error message: ", error["message"]);
                    console.log("Error status: ", error["status"]);
                    res.status(error.status).send(error.message);
                } catch (e) {
                    console.log("Error in parsing error message: ", e);
                    res.status(500).send("Internal Server Error");
                }
            } else {
                res.Status(500).send("Internal Server Error");
            }
        }
    );

//Github OAuth routes
router.get('/github', passport.authenticate('github'));

router.get('/github/callback', 
    passport.authenticate('github', { session: false }), (req: any, res: any) => {

        if(req.user){
            if('id' in req.user){
                const token = generateToken(req.user.id as string);
                res.redirect(`${process.env.FRONTEND_URL}?token=${token}&user=${JSON.stringify(req.user)}`); // Redirect with token and user id
            } else {
                res.status(400).send('User information is missing');
            }
        }
    },
        (err: any, req: any, res: any, next: any) => {
            //Handle callback errors
            if(err){
                try {
                    const error = JSON.parse(err);
                    console.log("Error message: ", error["message"]);
                    console.log("Error status: ", error["status"]);
                    res.status(error.status).send(error.message);
                } catch (e) {
                    console.log("Error in parsing error message: ", e);
                    res.status(500).send("Internal Server Error");
                }
            } else {
                res.Status(500).send("Internal Server Error");
            }
        }
    );

//Facebook OAuth routes
router.get('/facebook', passport.authenticate('facebook'));

router.get('/facebook/callback',
    passport.authenticate('facebook', { session: false }), (req: any, res: any) => {

        if(req.user){
            if('id' in req.user){
                const token = generateToken(req.user.id as string);
                res.redirect(`${process.env.FRONTEND_URL}?token=${token}&user=${JSON.stringify(req.user)}`); // Redirect with token and user id
            } else {
                res.status(400).send('User information is missing');
            }
        }
    },
        (err: any, req: any, res: any, next: any) => {
            //Handle callback errors
            if(err){
                try {
                    const error = JSON.parse(err);
                    console.log("Error message: ", error["message"]);
                    console.log("Error status: ", error["status"]);
                    res.status(error.status).send(error.message);
                } catch (e) {
                    console.log("Error in parsing error message: ", e);
                    res.status(500).send("Internal Server Error");
                }
            } else {
                res.Status(500).send("Internal Server Error");
            }
        }
    );

//LinkedIn OAuth routes
router.get('/linkedin', passport.authenticate('linkedin'));

router.get('/linkedin/callback',
    passport.authenticate('linkedin', { session: false }), (req: any, res: any) => {
        if(req.user){
            if('id' in req.user){
                const token = generateToken(req.user.id as string);
                res.redirect(`${process.env.FRONTEND_URL}?token=${token}&user=${JSON.stringify(req.user)}`); // Redirect with token and user id
            } else {
                res.status(400).send('User information is missing');
            }
        }
    },
        (err: any, req: any, res: any, next: any) => {
            //Handle callback errors
            if(err){
                try {
                    const error = JSON.parse(err);
                    console.log("Error message: ", error["message"]);
                    console.log("Error status: ", error["status"]);
                    res.status(error.status).send(error.message);
                } catch (e) {
                    console.log("Error in parsing error message: ", e);
                    res.status(500).send("Internal Server Error");
                }
            } else {
                res.Status(500).send("Internal Server Error");
            }
        }
    );

export default router;
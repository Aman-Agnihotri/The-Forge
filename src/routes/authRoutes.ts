import { Router } from "express";
import { loginUser, registerUser } from "../controllers/authController";

const router = Router();

//User Login route
router.post("/login", loginUser);

//User Registration route
router.post("/register", registerUser);

export default router;
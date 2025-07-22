import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { User } from "../models/user.models.js";

dotenv.config({ 
    path: "./.env" 
})

export const verifyJWT = asyncHandler(async (req,_,next) => {
try {
        const token = req.cookies.accessToken || req.headers("Authorization")?.replace("Bearer ", "");
    
        if (!token) {
            throw new ApiError(401, "Access token is required", [], "Authentication failed: No access token provided");
        }
        
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        if(!user) {
            throw new ApiError(404, "User not found", [], "Authentication failed: User does not exist");
        }
    
        req.user = user; // Attach user to request object
        next(); // Proceed to the next middleware or route handler
} catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token", [], "Authentication failed: Invalid token");
}

})
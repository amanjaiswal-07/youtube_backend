import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary , deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"; 
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import mongoose from "mongoose";
//import { verifyJWT } from "../middlewares/auth.middlewares.js";

dotenv.config({
    path: "./.env"
})

const generateAccessTokenandRefreshToken = async(userId) => {
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()//important to use the instance method generateAccessToken
        const refreshToken = user.generateRefreshToken()//important to use the instance method generateRefreshToken
        // Store the refresh token in the user document
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false}); // Save the user document with the new refresh token

        return { accessToken, refreshToken };
    }
    catch(error){
        throw new ApiError(500, error?.message || "Token generation failed", [], "User login failed: Token generation error");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // res.status(200).json({
    //     message: "OK",
    // })
    //how to register a user
    // 1. get details from frontend
    // 2. validate the details
    // 3. check if user already exists: username and email should be unique
    // 4. check for images and avatar
    // 5. upload images to cloudinary
    // 6. create user object - create in database .create
    // 7. remove password and refresh token from response
    // 8. check if user is created successfully
    // 9. return success response with user details

    // 1. Get details from frontend req.body have data from body also from form data
    const {username , email , fullname , password } = req.body;
    console.log("User Registration Details:", { username, email, fullname, password });

    // console.log(req.body);//for debugging purposes

    // 2. Validate the details
    // Check if any field is empty
    if(
        [username, email , fullname, password].some(
            (filed) => filed?.trim() === ''
        )
    ){
        throw new ApiError(406, "All fields are required", [], "User registration failed: Missing fields");
    }

    // Check if email conatains '@' and '.'
    if(!email.includes('@') || !email.includes('.')){
        throw new ApiError(406, "Invalid email format", [], "User registration failed: Invalid email");
    }
    // 406 Not Acceptable

    // check if full name and username is valid
    if(fullname.trim().length < 3 || username.trim().length < 3){
        throw new ApiError(406, "Full name or Username must be at least 3 characters long", [], "User registration failed: Invalid full name or username");
    }

    // 3. Check if user already exists

    const existedUser = await User.findOne({
        $or: [
            {username} , { email }
        ]
    });

    if(existedUser){
        throw new ApiError(409, "Username or Email already exists", [], "User registration failed: User already exists");
    }

    //409 Conflict

    // 4. Check for images and avatar

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverimageLocalPath = req.files?.coverimage[0]?.path;

    // console.log(req.files);//for debugging purposes

    let coverimageLocalPath = req.files?.coverimage ? req.files.coverimage[0]?.path : "";

    // let coverimageLocalPath
    // if (req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length > 0) {
    //     coverimageLocalPath = req.files.coverimage[0]?.path;   
    // }

    if(!avatarLocalPath){
        throw new ApiError(406, "Avatar image is required", [], "User registration failed: Missing avatar image");
    }

    console.log("Avatar Local Path:", avatarLocalPath);
    console.log("Cover Image Local Path:", coverimageLocalPath);

    // 5. Upload images to cloudinary
    // Assuming you have a cloudinary upload function

    const avatarUrl = await uploadOnCloudinary(avatarLocalPath);
    const coverimageUrl = await uploadOnCloudinary(coverimageLocalPath);
    if (!avatarUrl) {
        throw new ApiError(500, "Failed to upload images", [], "User registration failed: Image upload error");
    }

    // 6. Create user object
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullname,
        password,
        avatar:{
            url: avatarUrl.url,
            public_id: avatarUrl.public_id
        },
        coverimage: {
            url: coverimageUrl?.url || "",
            public_id: coverimageUrl?.public_id || ""
        }
    });

    // 7. Remove password and refresh token from response


    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    // 8. Check if user is created successfully

    if (!createdUser) {
        throw new ApiError(500, "User creation failed", [], "User registration failed: User not created");
    }

    // 9. Return success response with user details
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )

});

const loginUser = asyncHandler(async (req, res) => {
    // data from req body
    //username or email based on what user provides
    //find user in database
    //password check
    //access and refresh token generation
    //send cookies

    // 1. Get details from frontend
    const { username , email, password } = req.body;

    //username or email based on what user provides
    if(!(username || email)) {
        throw new ApiError(406, "Username or Email is required", [], "User login failed: Missing credentials");
    }

    //find user in database
    const user = await User.findOne({
        $or: [
            { username } , { email }
        ]
    })

    if(!user){
        throw new ApiError(404, "User not found", [], "User login failed: User does not exist");
    }

    //password check

    const isPasswordValid = await user.isPasswordMatch(password)
    //here one important thing is that we are using user instance method isPasswordMatch but User is a mongoose model so it has access to the methods defined in the UserSchema or findOne method etc
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid password", [], "User login failed: Incorrect password");
    }

    //access and refresh token generation

    const { accessToken, refreshToken } = await generateAccessTokenandRefreshToken(user._id);
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");// Remove password and refresh token from response 
    //why? 
    //because we don't want to send the password and refresh token in the response for security reasons

    //send cookies
    const cookieOptions = {
        httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
        secure: true, // Ensures the cookie is sent over HTTPS only
    };//only modifable by server not by frontend

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(
            200,
            {
                user: loggedInUser,
                accessToken, // Include access token in the response
                refreshToken // Include refresh token in the response
            },
            "User logged in successfully"
        )); // Send the user data without password and refresh token
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,{
            $unset:{ 
                refreshToken: 1 
            } // Clear the refresh token
        },
        { new: true} // Return the updated user document
    )

    const cookieOptions = {
        httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
        secure: true, // Ensures the cookie is sent over HTTPS only
    };

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(
            200,
            null,
            "User logged out successfully"
        )); // Send a success response without user data
        
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;//req.body.refreshToken is used to get the refresh token from the request body if it is not present in the cookies or user is using mobile app and req.cookies.refreshToken is used to get the refresh token from the cookies if it is present in the cookies
    if(!incomingRefreshToken){
        throw new ApiError(401, "Refresh token is required", [], "User refresh token failed: Missing refresh token");
    }

    // Verify the refresh token
    try {
        const decodedToken = jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET)
    
        if(!decodedToken){
            throw new ApiError(401, "Invalid refresh token", [], "User refresh token failed: Invalid refresh token");
        }
    
        // Find the user by ID
        const user = await User.findById(decodedToken._id);
    
        if(!user){
            throw new ApiError(404, "User not found", [], "User refresh token failed: User does not exist");
        }
    
        // Check if the refresh token matches the one stored in the user document
        if(user.refreshToken !== incomingRefreshToken){
            throw new ApiError(401, "Invalid refresh token", [], "User refresh token failed: Refresh token mismatch");
        }
    
        // Generate new access and refresh tokens 
    
        const options ={
            httpOnly: true, 
            secure: true, 
        }
    
        const {NewAccessToken , NewRefreshToken} = await generateAccessTokenandRefreshToken(user._id)
    
        return res
            .status(200)
            .cookie("accessToken", NewAccessToken, options)
            .cookie("refreshToken", NewRefreshToken, options)
            .json(new ApiResponse(
                200,
                {
                    accessToken : NewAccessToken,
                    refreshToken: NewRefreshToken
                },
                "Access token refreshed successfully"
            ));
    }
    catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token", [], "User refresh token failed: Token verification error");
    }
});

const changeCurrentPassword = asyncHandler(async (req,res) => {
    const { oldPassword , newPassword , confirmPassword } = req.body;

    if(!oldPassword || !newPassword || !confirmPassword){
        throw new ApiError(406, "All fields are required", [], "Change password failed: Missing fields");
    }

    const user = await User.findById(req.user?._id)
    if(!user) {
        throw new ApiError(404, "User not found");
    }
    //check is old password is correct
    const isOldPasswordValid = await user.isPasswordMatch(oldPassword);
    // from where req.user is coming? from auth middleware where we are verifying the JWT token and getting the user details
    //so why are not importing verifyJWT here? because we are already using it in the auth middleware and it is already applied to the routes where this controller is used

    if(!isOldPasswordValid){
        throw new ApiError(400, "Invalid old password");
    }

    if(!(newPassword === confirmPassword)){
        throw new ApiError(400, "Password should be same")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false}) 

    return res
    .status(200)
    .json(new ApiResponse (
        200 , {} , "Password is changed successfully"
    ))
});

const getCurrentUser = asyncHandler(async (req,res) =>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"current user fetched succesfully"))
});

const updateAccountdetails = asyncHandler(async (req,res)=>{
    const {fullname , email} = req.body

    if(!(fullname || email)){
        throw new ApiError(400, "all fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname: fullname,
                email: email
            }
        },{new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user , "Account Detail Updated successfully"))

});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar local file is missing");
    }

    // 1. Get the user first (to get old avatar public_id)
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // 2. Delete old avatar from Cloudinary (if it exists)
    if (user.avatar?.public_id) {
        await deleteFromCloudinary(user.avatar.public_id);
    }

    // 3. Upload new avatar
    const newAvatar = await uploadOnCloudinary(avatarLocalPath);

    if (!newAvatar?.url || !newAvatar?.public_id) {
        throw new ApiError(500, "Failed to upload new avatar to Cloudinary");
    }

    // 4. Update user with new avatar details
    user.avatar = {
        url: newAvatar.url,
        public_id: newAvatar.public_id,
    };

    await user.save();

    // 5. Return updated user (excluding sensitive fields)
    const updatedUser = await User.findById(user._id).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Avatar changed successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverimageLocalPath = req.file?.path;

    if (!coverimageLocalPath) {
        return res
        .status(400)
        .json(new ApiResponse(400, null, "No cover image provided"));
    }

    // 1. Get the user first (to get old avatar public_id)
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // 2. Delete old coverimage from Cloudinary (if it exists)
    if (user.coverimage?.public_id) {
        await deleteFromCloudinary(user.coverimage.public_id);
    }

    // 3. Upload new coverimage
    const newCoverImage = await uploadOnCloudinary(coverimageLocalPath);

    if (!newCoverImage?.secure_url || !newCoverImage?.public_id) {
        throw new ApiError(500, "Failed to upload new coverimage to Cloudinary");
    }

    // 4. Update user with new coverimage details
    user.coverimage = {
        url: newCoverImage.secure_url,
        public_id: newCoverImage.public_id,
    };

    await user.save();

    // 5. Return updated user (excluding sensitive fields)
    const updatedUser = await User.findById(user._id).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Coverimage changed successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiError(400, "Username is required")

    }
    // This is the structure *before* your $project stage
    // "subscribers": [
    // {
    //     "_id": "subscription_doc_1",
    //     "subscriber": ObjectId("USER_A_ID"),
    //     "channel": ObjectId("THE_CHANNEL_ID")
    // },
    // {
    //     "_id": "subscription_doc_2",
    //     "subscriber": ObjectId("LOGGED_IN_USER_ID"), // <-- Our user is in the list!
    //     "channel": ObjectId("THE_CHANNEL_ID")
    // },
    // {
    //     "_id": "subscription_doc_3",
    //     "subscriber": ObjectId("USER_C_ID"),
    //     "channel": ObjectId("THE_CHANNEL_ID")
    // }
    // ]
    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },
        {
            $lookup:{
                from: 'subscriptions',
                localField: '_id',
                foreignField: 'channel',
                as: 'subscribers'
                // For subscribers: You want to find subscriptions where the channel field in the subscriptions collection matches the _id of the current user (who is acting as a channel). So, localField: '_id' (the user's _id) and foreignField: 'channel' (the channel ID in subscriptions).

                // For subscribedTo: You want to find subscriptions where the subscriber field in the subscriptions collection matches the _id of the current user (who is acting as a subscriber). So, localField: '_id' (the user's _id) and foreignField: 'subscriber' (the subscriber ID in subscriptions).
            }
        },
        {
            $lookup:{
                from: 'subscriptions',
                localField: '_id',
                foreignField: 'subscriber',
                as: 'subscribedTo'
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: '$subscribers'
                },
                channelSubscribedToCount:{
                    $size: '$subscribedTo'
                },
                isSubscribed:{
                    $cond:{
                        if:{ $in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false 
                    }
            }
            }
        },
        {
            $project:{
                fullname: 1,
                username: 1,
                avatar: 1,
                coverimage: 1,
                email: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                createdAt: 1,
                updatedAt: 1
            }     
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "Channel not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"))
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match:{
                _id: req.user._id //_id: new mongoose.Types.ObjectId(req.user._id) is deprecated
            }
        },
        {
            $lookup:{
                from: 'videos',
                localField: 'watchHistory',
                foreignField: '_id',
                as: 'watchHistory',
                pipeline:[
                    {
                        $lookup:{
                            from: 'users',
                            localField: 'owner',
                            foreignField: '_id',
                            as: 'owner',
                            pipeline:[
                                {
                                    $project:{
                                        _id: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }

                    },
                    {
                        $addFields:{
                            owner:{
                                $first: '$owner'
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse (
        200,
        user[0]?.watchHistory || [],
        "Watch history fetched successfully"
    )
    )
});

export { registerUser , loginUser , logoutUser , refreshAccessToken , changeCurrentPassword, getCurrentUser , updateAccountdetails , updateUserAvatar , updateUserCoverImage , getUserChannelProfile , getWatchHistory};
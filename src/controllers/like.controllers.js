import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

//TODO: toggle like on video
const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID.");
    }

    const likedBy = req.user._id;

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: likedBy,
    });

    let likeStatus;

    if (existingLike) {
        // (un-like)
        await Like.findByIdAndDelete(existingLike._id);
        likeStatus = { isLiked: false };
    } else {
        // (like)
        await Like.create({
            video: videoId,
            likedBy: likedBy,
        });
        likeStatus = { isLiked: true };
    }

    return res
        .status(200)
        .json(new ApiResponse(200, likeStatus, "Like status toggled successfully."));
});

//TODO: toggle like on comment
const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Comment ID.");
    }

    const likedBy = req.user._id;

    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: likedBy,
    });

    let likeStatus;

    if (existingLike) {
        // (un-like)
        await Like.findByIdAndDelete(existingLike._id);
        likeStatus = { isLiked: false };
    } else {
        // (like)
        await Like.create({
            comment: commentId,
            likedBy: likedBy,
        });
        likeStatus = { isLiked: true };
    }

    return res
        .status(200)
        .json(new ApiResponse(200, likeStatus, "Like status toggled successfully."));
})

//TODO: toggle like on tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID.");
    }

    const likedBy = req.user._id;

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: likedBy,
    });

    let likeStatus;

    if (existingLike) {
        // (un-like)
        await Like.findByIdAndDelete(existingLike._id);
        likeStatus = { isLiked: false };
    } else {
        // (like)
        await Like.create({
            tweet: tweetId,
            likedBy: likedBy,
        });
        likeStatus = { isLiked: true };
    }

    return res
        .status(200)
        .json(new ApiResponse(200, likeStatus, "Like status toggled successfully."));
})

//TODO: get all liked videos
const getLikedVideos = asyncHandler(async (req, res) => {
    const user = req.user?._id
    if(!user){
        throw new ApiError(400, 'user not found')
    }

    //pagination
    const {page = 1 , limit = 10} =req.query
    const options = {
        page: parseInt(page,10),
        limit: parseInt(limit,10),
        sort : { createdAt : -1 },
    }

    const videos = Like.aggregate([
        {
            $match : {
                video: { $exists: true }, // Ensure we only get likes for videos
                likedBy : new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as:"likedVideo",
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField:"_id",
                            as:"ownerDetails",
                            pipeline:[
                                {
                                    $project:{
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $unwind: "$ownerDetails"
                    },
                    {
                        $project:{
                            thumbnail:1,
                            title:1,
                            duration:1,
                            views:1,
                            owner:1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$likedVideo"
        },
        {
            $replaceRoot: {
                newRoot: "$likedVideo",
            },
        }
    ])

    const likedVideos = await Like.aggregatePaginate(videos, options);

    if (!likedVideos || likedVideos.docs.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, [], "User has no liked videos."));
    }

    return res
        .status(200)
        .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully."));
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
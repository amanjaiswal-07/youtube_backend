import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.models.js"
import { Video } from "../models/video.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

//TODO: get all comments for a video and tweet
const getPostComments = asyncHandler(async (req, res) => {
    const { videoId, tweetId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    let matchCondition = {};
    if (videoId) {
        if (!mongoose.isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid Video ID.");
        }
        matchCondition = { video: new mongoose.Types.ObjectId(videoId) };
    } else if (tweetId) {
        if (!mongoose.isValidObjectId(tweetId)) {
            throw new ApiError(400, "Invalid Tweet ID.");
        }
        matchCondition = { tweet: new mongoose.Types.ObjectId(tweetId) };
    } else {
        throw new ApiError(400, "A video or tweet ID is required.");
    }

    const commentsAggregate = Comment.aggregate([
        {
            $match: matchCondition // Use the dynamically created condition here
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                owner: { $first: "$ownerDetails" },
                likesCount: { $size: "$likes" },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ]);
    
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    const comments = await Comment.aggregatePaginate(commentsAggregate, options);

    if (!comments || comments.docs.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, [], "No comments found."));
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully."));
});

// TODO: add a comment to a video
const addComment = asyncHandler(async (req, res) => {
    const {videoId , tweetId} = req.params
    const {content} = req.body
    if(!content){
        throw new ApiError(400, "Comment is required");
    }

    const commentData = {
        content : content,
        owner : req.user?._id
    }

    if(videoId){
        commentData.video = videoId
    }
    else if(tweetId){
        commentData.tweet = tweetId
    }
    else{
        throw new ApiError(400, "A video or tweet ID is required.")
    }

    const comment = await Comment.create(commentData);

    return res
        .status(201)
        .json(new ApiResponse(201, comment, "Comment added successfully."));
})

// TODO: update a comment
const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "comment id is required")
    }

    const {content} = req.body
    if(!content.trim()){
        throw new ApiError(400, "Content is required.");
    }

    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(404, "Comment not found.");
    }

    if(comment.owner.toString() != req.user?._id.toString()){
        throw new ApiError(403, "You do not have permission to update this comment.");
    }

    comment.content = content

    const updatedComment = await comment.save() 

    return res
    .status(200)
    .json(new ApiResponse(
        200, updatedComment, "Commment updated successfully."
    ))
})

// TODO: delete a comment
const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "comment id is required")
    }

    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(404, "Comment not found.");
    }

    if(comment.owner.toString() != req.user?._id.toString()){
        throw new ApiError(403, "You do not have permission to delete this comment.");
    }

    await Comment.findByIdAndDelete(commentId)

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment deleted successfully."));

})

export {
    getPostComments, 
    addComment, 
    updateComment,
     deleteComment
    }
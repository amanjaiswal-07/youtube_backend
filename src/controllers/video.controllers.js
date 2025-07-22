import mongoose, {isValidObjectId, Mongoose} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"

//TODO: get all videos based on query, sort, pagination
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    // --- 1. Build the dynamic match query ---
    // We should only get published videos
    const match = {
        isPublished : true
    };

    // If a text query is provided, set up a text search
    if (query) {
        match.$text = { $search: query };
    }

    // If a userId is provided, filter by that user
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid User ID format.");
        }
        match.owner = new mongoose.Types.ObjectId(userId);
    }

    // --- 2. Build the dynamic sort query ---
    const sort = {};
    if (sortBy && sortType) {
        sort[sortBy] = sortType === 'desc' ? -1 : 1;
    } else {
        // Default sort by creation date
        sort.createdAt = -1;
    }
    
    // --- 3. Build the aggregation pipeline ---
    const pipeline = [
        { $match: match },
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
        { $unwind: "$ownerDetails" }, // Unwind to make owner an object
        { $sort: sort }
    ];

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    // --- 4. Execute the query with pagination ---
    const videos = await Video.aggregatePaginate(videoAggregate, options);
    
    if (!videos || videos.docs.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, [], "No videos found."));
    }

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully."));

})

// TODO: get video, upload to cloudinary, create video
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    if((!title || title.trim().length <3) || (!description || description.trim().length <3)){
        throw new ApiError(400 , "title or discription is required and longer than 3 characters")
    }

    const videoFileLocalPath = req.files?.videoFile[0].path
    if(!videoFileLocalPath){
        throw new ApiError(406, "video file is required");
    }
    
    const thumbnailLocalPath = req.files?.thumbnail[0].path
    if(!thumbnailLocalPath){
        throw new ApiError(406, "Thumbnail is required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    if(!videoFile?.url){
        throw new ApiError(500, "video file cant be upload due to error on upload on cloudinary")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if(!thumbnail?.url){
        throw new ApiError(500, "thumbnail cant be upload due to error on upload on cloudinary")
    }
    
    const createdVideo = await Video.create({
        title: title,
        description: description,
        owner: req.user?._id,
        videoFile:{
            url: videoFile.url,
            public_id: videoFile.public_id
        },
        thumbnail:{
            url: thumbnail.url,
            public_id: thumbnail.public_id
        },
        duration: videoFile.duration
    })

    if(!createdVideo) {
        throw new ApiError(500, "Failed to create video record in database.");
    }

    const video = await Video.findById(createdVideo._id).populate(
        "owner",
        "username avatar"
    );

    return res
    .status(200)
    .json(new ApiResponse(200,video,"Video published successfully."))
})

//TODO: get video by id
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "video id not found")
    }

    await Video.findByIdAndUpdate(videoId, {
        $inc: { views: 1 },
    });

    const userId = req.user?._id;
    if(userId){
        await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: { watchHistory: videoId },
        });
    }

    const videos = await Video.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline:[
                    {
                        $lookup:{
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
                        }
                    },
                    {
                        $addFields:{
                            subscribersCount:{
                                $size: "$subscribers"
                            },
                            isSubscribed:{
                                $cond: {
                                    if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project:{
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                ownerDetails: { $first: "$ownerDetails" }
            }
        },
        {
            $lookup:{
                from:"likes",
                localField: "_id",
                foreignField: "video",
                as: "liked",
            }
        },
        {
            $addFields:{
                likecount:{
                    $size: "$liked"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$liked.likedBy"] },
                        then: true,
                        else: false
                    }
                } 
            }
        },
        {
            $lookup:{
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "commented",
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $unwind: '$owner'
                    },
                    {
                        $sort: {createdAt : -1}
                    }
                ]
            }
        },
        {
            $addFields:{
                commentCount:{
                    $size : "$commented"
                },
            }
        },
        {
            $project:{
                _id: 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                updatedAt:1,
                videoFile: 1,
                thumbnail: 1,
                ownerDetails: 1,
                likecount: 1,
                isLiked: 1,
                commentCount: 1,
                commented: {
                    _id: 1,
                    text: 1,
                    createdAt: 1,
                    owner: {
                        _id: 1,
                        username: 1,
                        avatar: 1
                    }
                }
            }
        }
    ])

    if (!videos.length) {
        throw new ApiError(404, "Video not found.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, videos[0], "Video details fetched successfully."));
// $addFields: { ownerDetails: { $first: "$ownerDetails" } } Purpose:This takes the first element of an array and converts it into a single object.
// $unwind is also used to flatten arrays, but it splits the array into multiple documents (one for each element in the array).
})

//TODO: update video details like title, description, thumbnail
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailLocalPath = req.file?.path;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID format.");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found.");
    }
    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You do not have permission to update this video.");
    }

    if (thumbnailLocalPath) {
        const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (!newThumbnail?.url) {
            throw new ApiError(500, "Error uploading thumbnail to Cloudinary.");
        }

        if (video.thumbnail?.public_id) {
            await deleteFromCloudinary(video.thumbnail.public_id);
        }

        video.thumbnail = {
            url: newThumbnail.url,
            public_id: newThumbnail.public_id,
        };
    }

    if (title) {
        if (title.trim().length < 3){
            throw new ApiError(400, "Title must be at least 3 characters.");
        }
        video.title = title;
    }

    if (description) {
        if (description.trim().length < 3){
            throw new ApiError(400, "Description must be at least 3 characters.");
        }
        video.description = description;
    }

    const updatedVideo = await video.save();

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video details updated successfully."));

})

//TODO: delete video
const deleteVideo = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400 ,"no Video is found")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found.")
    }

    if(video.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "You do not have permission to delete this Video.")
    }

    if(video.videoFile?.public_id) {
        await deleteFromCloudinary(video.videoFile.public_id , 'video');
    }

    if(video.thumbnail?.public_id) {
        await deleteFromCloudinary(video.thumbnail.public_id);
    }
    
    await Video.findByIdAndDelete(videoId);
    
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully."));
})

//TODO : toggle Publish Status 
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400 ,"no Video is found")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found.")
    }

    if(video.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "You do not have permission.")
    }

    video.isPublished = !video.isPublished
    await video.save({ validateBeforeSave: false });
    // Using validate:false as we are only updating one field

    return res
    .status(200)
    .json(
        new ApiResponse(200, { isPublished: video.isPublished }, "Publish status toggled successfully.")
    );
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
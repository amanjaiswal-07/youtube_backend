import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

//TODO: create playlist
const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    if(!name?.trim() || !description?.trim()){
        throw new ApiError(400, " Name and description is required for playlist ")
    }

    const user = req.user?._id
    if(!user){
        throw new ApiError(401,"user not found must be login")
    }

    const playlist = await Playlist.create({
        name: name,
        description: description,
        owner: req.user?._id
    })

    return res
    .status(201)
    .json( new ApiResponse(201 , playlist , "Playlist created successfully"))

})

//TODO: get user playlists
const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    if(!isValidObjectId(userId)){
        throw new ApiError(401,"user not found")
    }

    const playlist = await Playlist.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            } 
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
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
            $lookup:{
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline:[
                    {
                        $project:{
                            thumbnail:1,
                            title:1,
                            duration:1,
                            views:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                owner:{
                    $first : "$owner"
                },
                perPlaylistVideoCount:{
                    $size: "$videos"
                },
            }
        },
        {
            $project:{
                name:1,
                description:1,
                owner:1,
                videos:1,
                perPlaylistVideoCount:1,
                createdAt:1,
                updatedAt:1,
            }
        }
    ])

    if (!playlist || playlist.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, [], "User has no playlists."));
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "user playlist fetched successfully."));

})

//TODO: get playlist by id
const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(!isValidObjectId(playlistId)){
        throw new ApiError(401 , " Playlist not found ")
    }

    const playlist = await Playlist.aggregate([
        {
            $match:{
                _id : new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
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
            $lookup:{
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
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
                        $unwind: "$owner"
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
            $addFields:{
                owner:{
                    $first: "$owner"
                },
                playlistVideoCount:{
                    $size:"$videos"
                }
            }
        },
        {
            $project:{
                name:1,
                description:1,
                playlistVideoCount:1,
                owner:1,
                videos:1,
                createdAt:1,
                updatedAt:1,
            }
        }
    ])

    if (!playlist || playlist.length === 0) {
         throw new ApiError(404, "Playlist not found.");
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, playlist[0], "Playlist fetched successfully."));
})

//TODO: add Video To Playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!(isValidObjectId(playlistId) && isValidObjectId(videoId))){
        throw new ApiError(400, "Playlist ID Or Video ID is not found")
    }

    const playlist = await Playlist.findById(playlistId)
    if(playlist){
        if(playlist.owner.toString() !== req.user?._id.toString()){
            throw new ApiError(403, "You do not have permission to add video in this playlist.")
        }
        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $addToSet: { videos: videoId }
            },
            {
                new: true
            }
        )

        return res
            .status(200)
            .json(new ApiResponse(200 , updatedPlaylist , "Video added to Playlist successfully"))
    }
    else{
        throw new ApiError(400, "Playlist not found")
    }
})

// TODO: remove video from playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!(isValidObjectId(playlistId) && isValidObjectId(videoId))){
        throw new ApiError(400, "Playlist ID Or Video ID is not found")
    }

    const playlist = await Playlist.findById(playlistId)
    
    if(playlist){
        if(playlist.owner.toString() !== req.user?._id.toString()){
            throw new ApiError(403, "You do not have permission to remove video from this playlist.")
        }
        //const updatedPlaylist = await Playlist.videos.findByIdAndDelete(videoId) this will delete video from db but we have to jsut remove id from videos array
        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $pull: { videos: videoId }// This removes the videoId from the videos array
            },
            {
                new: true // to return the updated document
            }
        )

        return res
            .status(200)
            .json(new ApiResponse(200 , updatedPlaylist , "Video removed from Playlist successfully"))
    }
    else{
        throw new ApiError(404, "Playlist not found")
    }
})

// TODO: delete playlist
const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Playlist ID is not found")
    }

    const playlist = await Playlist.findById(playlistId)
    
    if(playlist){
        if(playlist.owner.toString() !== req.user?._id.toString()){
            throw new ApiError(403, "You do not have permission to delete this playlist.")
        }

        await Playlist.findByIdAndDelete(playlistId)
        return res
            .status(200)
            .json(new ApiResponse(200 , {} , "Playlist deleted successfully"))
    }
    else{
        throw new ApiError(404, "Playlist not found")
    }
})

//TODO: update playlist
const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Playlist ID is not found")
    }

    const playlist = await Playlist.findById(playlistId)
    if(playlist){
        if(playlist.owner.toString() !== req.user?._id.toString()){
            throw new ApiError(403, "You do not have permission to add video in this playlist.")
        }
    }
    else{
        throw new ApiError(400, "Playlist not found")
    }

    if(name){
        if(!name.trim()){
            throw new ApiError(400, "Playlist name is required")
        }
        playlist.name = name.trim()
    }

    if(description){
        if(!description.trim()){
            throw new ApiError(400, "Playlist description is required")
        }
        playlist.description = description.trim()
    }

    const updatedPlaylistDetail = await playlist.save()

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylistDetail, "Playlist Detail updated successfully.")); 
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
import {User} from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js"; 
import { asyncHandler } from "../utils/asyncHandler.js";
import { subscription } from "../models/subscription.models.js";
import mongoose, { isValidObjectId } from "mongoose";

// controller to return subscriber list of a channel
const getUserChannelSubscriber = asyncHandler(async(req,res)=>{
    const {channelId} = req.params
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Channel ID is required")
    }
    
    const subscriber = await subscription.aggregate([
        {
            $match:{
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup:{
                from: 'users',
                localField: 'subscriber',
                foreignField: '_id',
                as: 'subscriberInfo',
                pipeline:[
                    {
                        $project:{
                            _id: 1,
                            username: 1,
                            avatar: 1,
                            email: 1
                        }
                    }
                ]
            }
        },
        {
            $project:{
                //subscriberInfo : 1
                _id: { $arrayElemAt: ["$subscriberInfo._id", 0] },
                username: { $arrayElemAt: ["$subscriberInfo.username", 0] },
                avatar: { $arrayElemAt: ["$subscriberInfo.avatar", 0] },
                email: { $arrayElemAt: ["$subscriberInfo.email", 0] }
            }
        }
    ])

    if(!subscriber?.length){
        throw new ApiError(404, "Subscriber not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, subscriber, "Subscriber fetched successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async(req,res)=>{
    const {subscriberId} = req.params
    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400, "Subscriber ID is required")
    }

    const channel = await subscription.aggregate([
        {
            $match:{
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from: 'users',
                localField: 'channel',
                foreignField: '_id',
                as: 'channelInfo',
                pipeline:[
                    {
                        $project:{
                            _id : 1,
                            username: 1,
                            email: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $project:{
                _id: { $arrayElemAt: ["$channelInfo._id", 0] },
                username: { $arrayElemAt: ["$channelInfo.username", 0] },
                email: { $arrayElemAt: ["$channelInfo.email", 0] },
                avatar: { $arrayElemAt: ["$channelInfo.avatar", 0] }
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "Channel not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, channel, "Channel fetched successfully"))
})

// toggle subscription
const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const subscriberId = req.user?._id

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    if (!subscriberId) {
        throw new ApiError(401, "Unauthorized request. Please log in.");
    }
    
    const check = {
        subscriber: subscriberId,
        channel: channelId
    }

    try {
        const existingSubscription = await subscription.findOne(check)
        let isSubscribed
        let message
        if(existingSubscription){
            await subscription.findByIdAndDelete(existingSubscription._id)
            isSubscribed = false
            message = "Unsubscribed successfully"
        }
        else{
            await subscription.create(check)
            isSubscribed = true
            message = "Subscribed successfully"
        }

        return res
        .status(200)
        .json( new ApiResponse(200 , {subscribed: isSubscribed} , message) )

    } catch (error) {
        throw new ApiError(500, error?.message || "An error occurred while toggling subscription")
    }
})

export {getUserChannelSubscriber , getSubscribedChannels , toggleSubscription}
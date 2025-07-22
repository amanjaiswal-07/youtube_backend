import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { uploadOnCloudinary , deleteFromCloudinary } from "../utils/cloudinary.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"
import { populate } from "dotenv"

//TODO: create tweet
const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body
    if(!content || content.trim().length < 3){
        throw new ApiError(400, 'content is required and longer than 3 characters')
    }

    let image = {}
    const imageLocalPath = req.file?.path
    console.log(imageLocalPath)
    if(imageLocalPath){
        const uploadedImage = await uploadOnCloudinary(imageLocalPath);
        if (!uploadedImage) {
            throw new ApiError(500, 'Failed to upload image to Cloudinary');
        }
        image = {
            url: uploadedImage.url,
            public_id: uploadedImage.public_id,
        };
    }

    const user = await User.findById(req.user?._id).select('-fullname -email -refreshToken -password -watchHistory')
    if(!user){
        throw new ApiError(404,"user not found")
    }

    const tweet = await Tweet.create({
        content: content,
        image: image.url ? image : undefined,
        owner: user
    })

    return res
    .status(201)
    .json( new ApiResponse(201 , tweet , "tweet created successfully"))
})

// TODO: get user tweets
const getUserTweets = asyncHandler(async (req, res) => {
    const {userId} = req.params
    if(!isValidObjectId(userId)){
        throw new ApiError(400, "cant find user")
    }

    // const userTweet = await Tweet.find({owner : userId})

    // return res
    // .status(200)
    // .json(new ApiResponse(200, userTweet , "User tweets retrieved successfully."))

    //pagination
    const {page = 1 , limit = 10} =req.query
    const options = {
        page: parseInt(page,10),
        limit: parseInt(limit,10),
        sort : { createdAt : -1 },
        populate:{
            path: "owner",
            select: "username avatar"
        }
    }

    const tweet = Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        }
    ])

    const userTweet = await Tweet.aggregatePaginate(tweet, options)

    if(!userTweet || userTweet.docs.length === 0){
        return res
            .status(200)
            .json(new ApiResponse(200, [], "User has no tweets."));
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                userTweet,
                "User tweets retrieved successfully."
            )
        );
})

//TODO: update tweet
const updateTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400 , "no tweet is found")
    }

    const {content} = req.body
    const imageLocalPath = req.file?.path
    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(404, "Tweet not found.")
    }

    if(tweet.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "You do not have permission to update this tweet.")
    }

    if(imageLocalPath){
        const newImage = await uploadOnCloudinary(imageLocalPath)
        if (!newImage?.url) {
            throw new ApiError(500, "Failed to upload new image.");
        }
        if (tweet.image?.public_id) {
            await deleteFromCloudinary(tweet.image.public_id);
        }
        tweet.image={
            url: newImage.url,
            public_id: newImage.public_id,
        }
    }

    if(content){
        if (content.trim().length < 3) {
            throw new ApiError(400, 'Content must be at least 3 characters long.');
        }
        tweet.content = content;
    }

    const updatedTweet = await tweet.save()

    return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully."));
})

//TODO: delete tweet
const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400 ,"no tweet is found")
    }

    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(404, "Tweet not found.")
    }

    if(tweet.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "You do not have permission to delete this tweet.")
    }

    if (tweet.image?.public_id) {
        await deleteFromCloudinary(tweet.image.public_id);
    }
    
    await Tweet.findByIdAndDelete(tweetId);
    
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Tweet deleted successfully."));
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}

// Of course. Pagination can seem complex, but it's based on a very simple idea. Let's break down the concept and the code syntax.

// The entire goal of pagination is to avoid fetching thousands of records from the database at once. Instead, we ask for small, manageable "pages" of data.

// ## The Core Concept: limit and skip
// Imagine you have 100 tweets and you want to show 10 tweets per page.

// Page 1: You need tweets 1 through 10.

// Page 2: You need tweets 11 through 20.

// Page 3: You need tweets 21 through 30.

// To do this in a database, you use two commands:

// limit: This tells the database the maximum number of items to return. For our example, the limit is always 10.

// skip: This tells the database how many items to ignore from the beginning of the list. This is the key to getting to the correct page.

// Let's look at the skip value for each page:

// For Page 1, you skip 0 items.

// For Page 2, you skip the first 10 items.

// For Page 3, you skip the first 20 items.

// This leads to a simple formula:
// items_to_skip = (current_page - 1) * items_per_page

// ## How the Library and Code Work
// The library mongoose-aggregate-paginate-v2 does all this skip and limit math for you, which is why we use it. Let's look at the code step-by-step.

// Step 1: Get Page and Limit from the Client

// const { page = 1, limit = 10 } = req.query;
// What it does: This line looks for page and limit in the URL's query string. For example: .../tweets/some-user-id?page=2&limit=15.

// Syntax: It uses object destructuring. If req.query.page doesn't exist, it defaults to 1. If req.query.limit doesn't exist, it defaults to 10.

// Step 2: Create the options Object

// const options = {
//     page: parseInt(page, 10),
//     limit: parseInt(limit, 10),
//     sort: { createdAt: -1 },
//     populate: {
//         path: "owner",
//         select: "username avatar",
//     },
// };
// What it does: This object bundles all our preferences for the pagination library.

// Syntax:

// page & limit: We pass the numbers we got from the client. parseInt ensures they are treated as numbers, not text.

// sort: This tells the library how to order the items before creating pages. { createdAt: -1 } means "sort by the creation date in descending order" (newest first).

// populate: This is a powerful feature that tells the library to also fetch related data (like the tweet owner's username and avatar).

// Step 3: Set Up the Main Database Query
// JavaScript

// const tweetsAggregate = Tweet.aggregate([
//     {
//         $match: {
//             owner: new mongoose.Types.ObjectId(userId),
//         },
//     },
// ]);
// What it does: This defines the base query. We're telling the database, "First, find all the tweets where the owner matches this userId." The pagination will be applied to these results.

// Step 4: Execute the Pagination
// JavaScript

// const userTweets = await Tweet.aggregatePaginate(tweetsAggregate, options);
// What it does: This is the final step where the magic happens. The .aggregatePaginate function (which we got from the plugin) takes your base query and your options and does everything:

// Executes the $match to find all relevant tweets.

// Applies the sort order.

// Calculates the correct skip value based on the page and limit.

// Applies the skip and limit to get just the items for the current page.

// Runs a separate, efficient count to find the totalDocs.

// Returns a single, neat object with all the data and metadata.

// The userTweets object it returns looks something like this, which is perfect for sending back to the client:

// JSON

// {
//     "docs": [ ... ], // The array of tweets for the current page
//     "totalDocs": 100,
//     "limit": 10,
//     "totalPages": 10,
//     "page": 2,
//     "hasNextPage": true,
//     "hasPrevPage": true,
//     "prevPage": 1,
//     "nextPage": 3
// }
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
// import dotenv from 'dotenv'
// dotenv.config({
//     path: "./.env" 
// }) // Load environment variables from .env file

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true // Allow credentials (cookies, authorization headers, etc.)
}))

app.use(express.json({limit: '16kb'})) // Parse JSON bodies //data comming from form or API
app.use(express.urlencoded({extended: true, limit: '16kb'})) // Parse URL-encoded bodies
app.use(express.static('public')) // Serve static files from the 'public' directory // anything in public folder can be accessed directly
app.use(cookieParser()) // Parse cookies from the request headers

//app.use(cors) here .use are used for middleware or configuration

// Import routes
import userRoutes from './routes/user.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import tweetRoutes from './routes/tweet.routes.js'
import videoRoutes from './routes/video.routes.js'
import commentRoutes from './routes/comment.routes.js'
import playlistRoutes from './routes/playlist.routes.js'
import likeRoutes from './routes/like.routes.js'

// Define routes
app.use('/api/v1/users', userRoutes); // Use user routes under the /api/users path
app.use('/api/v1/subscriptions', subscriptionRoutes); // Use subscription routes under the /api/subscriptions path
app.use('/api/v1/tweets',tweetRoutes)
app.use('/api/v1/videos',videoRoutes)
app.use('/api/v1/comments',commentRoutes)
app.use('/api/v1/playlists',playlistRoutes)
app.use('/api/v1/likes',likeRoutes)


//http://localhost:8000/api/v1/users/register
export {app}
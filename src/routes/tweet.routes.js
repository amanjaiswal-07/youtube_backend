import { Router } from 'express';
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
} from "../controllers/tweet.controllers.js"
import {verifyJWT} from "../middlewares/auth.middlewares.js"
import {upload} from "../middlewares/multer.middlewares.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(upload.single('image') , createTweet);
router.route("/user/:userId").get(getUserTweets);
router.route("/:tweetId").patch(upload.single('image'),updateTweet)
router.route("/:tweetId").delete(deleteTweet)

export default router
import { Router } from 'express';
import {
    addComment,
    deleteComment,
    getPostComments,
    updateComment,
} from "../controllers/comment.controllers.js"
import {verifyJWT} from "../middlewares/auth.middlewares.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/video/:videoId").get(getPostComments).post(addComment);
router.route("/tweet/:tweetId").get(getPostComments).post(addComment);
router.route("/:commentId").patch(updateComment).delete(deleteComment);

export default router
import {Router} from "express";
import { loginUser, logoutUser, registerUser , refreshAccessToken ,updateUserAvatar ,updateUserCoverImage, getUserChannelProfile ,changeCurrentPassword, getCurrentUser ,updateAccountdetails , getWatchHistory} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.route('/register').post(
    upload.fields([
        {
            name: 'avatar', 
            maxCount: 1 // Limit to one avatar image
        },
        {
            name: 'coverimage', 
            maxCount: 1 // Limit to one additional image
        }
    ]),
    registerUser)    // Register user route

router.route('/login').post(loginUser)

//secured logout route
router.route('/logout').post(verifyJWT , logoutUser)
router.route('/referesh-token').post(refreshAccessToken)

router.route('/change-password').post(verifyJWT , changeCurrentPassword)
router.route('/current-user').get(verifyJWT , getCurrentUser)
router.route('/update-account-details').patch(verifyJWT , updateAccountdetails)

router.route('/update-avatar').put(verifyJWT , upload.single('avatar') , updateUserAvatar)
router.route('/update-coverimage').put(verifyJWT , upload.single('coverimage'), updateUserCoverImage)
router.route('/channel/:username').get(verifyJWT , getUserChannelProfile)

router.route('/watch-history').get(verifyJWT , getWatchHistory)

export default router;


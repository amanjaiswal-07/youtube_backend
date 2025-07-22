import { Router } from "express";
import {getUserChannelSubscriber , getSubscribedChannels , toggleSubscription} from "../controllers/subscription.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js"

const router = Router()

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route('/channel/:channelId/subscribers').get(getUserChannelSubscriber)
router.route('/subscriber/:subscriberId/channels').get(getSubscribedChannels)
router.route('/channel/:channelId/toggle-subscription').post(toggleSubscription)

export default router
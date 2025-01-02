const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const isAuth = require("../../authentication/is-auth");
const callController = require("../../controllers/call");



router.post('/',isAuth, callController.initiateCall);

// Get call history for the authenticated user
router.get('/:userId',isAuth, callController.getCallHistory);

// End an ongoing call session
router.delete('/:callId', isAuth, callController.endCall);

// Get details of a specific call
router.get('/:callId', isAuth, callController.getCallDetails);


module.exports = router;
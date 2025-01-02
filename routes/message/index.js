const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const isAuth = require("../../authentication/is-auth");
const messageController = require("../../controllers/message");


router.post(
    "/new",
    isAuth,
    [
      body("chatId").not().isEmpty(),
      body("senderId").not().isEmpty(),
      body("text").not().isEmpty(),
    ],
    messageController.sendMessage 
  );


  router.get('/:chatId',isAuth, messageController.getMessagesInChat);


router.get('/unread/:userId',isAuth, messageController.getUnreadMessages);

// Delete a specific message by ID
router.delete('/:messageId',isAuth, messageController.deleteMessage);

// Mark messages as read for a specific user
router.put('/mark-read/:userId',isAuth, messageController.markMessagesAsRead);


module.exports = router;
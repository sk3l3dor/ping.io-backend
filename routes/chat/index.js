const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const isAuth = require("../../authentication/is-auth");
const chatController = require("../../controllers/chat");


router.post(
    "/",
    [
      body("participants").not().isEmpty(),
      body("name").not().isEmpty(),
      body("isGroupCHat").not().isEmpty(),
    ],
    chatController.newChat 
  );


  router.get(
    "/user/:id",chatController.getAllChatsForUser
  );

  router.get('/:chatId',isAuth, chatController.getChatById);


  router.put(
            '/:chatId',
             isAuth,
             [
                body("chatName").not().isEmpty(),
                body("chatType").not().isEmpty(),
              ],
              chatController.updateChatInformation
            ); 
            
            
            
  router.delete('/:chatId', isAuth, chatController.deleteChat);



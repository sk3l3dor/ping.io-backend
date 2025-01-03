const express = require("express");
const http = require("http");
const https = require('https');
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const morgan = require("morgan");
const helmet = require("helmet");
const path = require("path");
const cors = require("cors");
const passport = require('passport');
const session = require('express-session');
const { google } = require('googleapis');
const crypto = require('crypto');
const User = require("./models/User");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(cors());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const REDIRECT_URL = 'http://localhost:4041/oauth2callback'

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URL
  );

  const scopes = [
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/calendar.readonly'
  ];

  let userCredential = null;


// Session setup for Passport
app.use(session({
    secret: 'your-secret-key', // Change this to a strong secret
    resave: false,
    saveUninitialized: true
}));


app.get('/', async (req, res) => {
    // Generate a secure random state value.
    const state = crypto.randomBytes(32).toString('hex');
    // Store state in the session
    req.session.state = state;

    // Generate a url that asks permissions for the Drive activity and Google Calendar scope
    const authorizationUrl = oauth2Client.generateAuthUrl({
      // 'online' (default) or 'offline' (gets refresh_token)
      access_type: 'offline',
      /** Pass in the scopes array defined above.
        * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
      scope: scopes,
      // Enable incremental authorization. Recommended as a best practice.
      include_granted_scopes: true,
      // Include the state parameter to reduce the risk of CSRF attacks.
      state: state
    });

    res.redirect(authorizationUrl);
  });

  // Receive the callback from Google's OAuth 2.0 server.
  app.get('/oauth2callback', async (req, res) => {
    // Handle the OAuth 2.0 server response
    let q = url.parse(req.url, true).query;

    if (q.error) { // An error response e.g. error=access_denied
      console.log('Error:' + q.error);
    } else if (q.state !== req.session.state) { //check state value
      console.log('State mismatch. Possible CSRF attack');
      res.end('State mismatch. Possible CSRF attack');
    } else { // Get access and refresh tokens (if access_type is offline)
      let { tokens } = await oauth2Client.getToken(q.code);
      oauth2Client.setCredentials(tokens);

      /** Save credential to the global variable in case access token was refreshed.
        * ACTION ITEM: In a production app, you likely want to save the refresh token
        *              in a secure persistent database instead. */
      userCredential = tokens;
      
      // User authorized the request. Now, check which scopes were granted.
      if (tokens.scope.includes('https://www.googleapis.com/auth/drive.metadata.readonly'))
      {
        // User authorized read-only Drive activity permission.
        // Example of using Google Drive API to list filenames in user's Drive.
        const drive = google.drive('v3');
        drive.files.list({
          auth: oauth2Client,
          pageSize: 10,
          fields: 'nextPageToken, files(id, name)',
        }, (err1, res1) => {
          if (err1) return console.log('The API returned an error: ' + err1);
          const files = res1.data.files;
          if (files.length) {
            console.log('Files:');
            files.map((file) => {
              console.log(`${file.name} (${file.id})`);
            });
          } else {
            console.log('No files found.');
          }
        });
      }
      else
      {
        // User didn't authorize read-only Drive activity permission.
        // Update UX and application accordingly
      }

      // Check if user authorized Calendar read permission.
      if (tokens.scope.includes('https://www.googleapis.com/auth/calendar.readonly'))
      {
        // User authorized Calendar read permission.
        // Calling the APIs, etc.
      }
      else
      {
        // User didn't authorize Calendar read permission.
        // Update UX and application accordingly
      }
    }
  });

  // Example on revoking a token
  app.get('/revoke', async (req, res) => {
    // Build the string for the POST request
    let postData = "token=" + userCredential.access_token;

    // Options for POST request to Google's OAuth 2.0 server to revoke a token
    let postOptions = {
      host: 'oauth2.googleapis.com',
      port: '443',
      path: '/revoke',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    // Set up the request
    const postReq = https.request(postOptions, function (res) {
      res.setEncoding('utf8');
      res.on('data', d => {
        console.log('Response: ' + d);
      });
    });

    postReq.on('error', error => {
      console.log(error)
    });

    // Post the request with data
    postReq.write(postData);
    postReq.end();
  });




// Static files
const API_ROOT = '/';
app.use(`${API_ROOT}assets`, express.static(path.join(__dirname, "assets")));
app.disable('etag');

// Routes
const userRoutes = require("./routes/user");
const callRoutes = require("./routes/call");
const chatRoutes = require("./routes/chat");
const messageRoutes = require("./routes/message");
const authRoutes = require("./routes/auth");

app.use(`${API_ROOT}user`, userRoutes);
app.use(`${API_ROOT}call`, callRoutes);
app.use(`${API_ROOT}chat`, chatRoutes);
app.use(`${API_ROOT}message`, messageRoutes);
app.use(`${API_ROOT}auth`, authRoutes); // Use the auth routes for Google SSO

app.use("/", (req, res) => {
    return res.status(200).send("Welcome!");
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);

    socket.on('chat message', (msg, callback) => {
        console.log('Message received: ' + msg);
        io.emit('chat message', msg);
        callback('Message received');
    });

    socket.on('private message', (msg, recipientId) => {
        socket.to(recipientId).emit('private message', msg);
    });

    socket.on('disconnect', () => {
        console.log('User  disconnected: ' + socket.id);
    });

    socket.on('join room', (room) => {
        socket.join(room);
        console.log(`User  ${socket.id} joined room: ${room}`);
        socket.to(room).emit('user joined', socket.id);
    });

    socket.on('leave room', (room) => {
        socket.leave(room);
        console.log(`User  ${socket.id} left room: ${room}`);
    });

    socket.on('room message', (msg, room) => {
        io.to(room).emit('room message', msg);
    });

    socket.on('user typing', (room) => {
        socket.to(room).emit('user typing', socket.id);
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });
});

// Database connection and server start
const startServer = async () => {
    try {
        const DB_URL = process.env.PNG_V1_DB_URL;
        const PORT = process.env.PNG_V1_PORT;

        await mongoose.connect(DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("DB Connection Successful");

        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Error in connecting to DB:", error);
    }
};

startServer();
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

require("dotenv").config();
const mongoose = require("mongoose");
const morgan = require("morgan");
const helmet = require("helmet");
const path = require("path");
const cors = require("cors");

app.use(cors());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const API_ROOT = '/';
app.use(`${API_ROOT}assets`, express.static(path.join(__dirname, "assets")));
app.disable('etag');

// Your existing routes
const userRoutes = require("./routes/user");
const callRoutes = require("./routes/call");
const chatRoutes = require("./routes/chat");
const messageRoutes = require("./routes/message");

app.use(`${API_ROOT}user`, userRoutes);
app.use(`${API_ROOT}call`, callRoutes);
app.use(`${API_ROOT}chat`, chatRoutes);
app.use(`${API_ROOT}message`, messageRoutes);

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
        console.log('User disconnected: ' + socket.id);
    });

    socket.on('join room', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);
        socket.to(room).emit('user joined', socket.id);
    });

    socket.on('leave room', (room) => {
        socket.leave(room);
        console.log(`User ${socket.id} left room: ${room}`);
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
        const DB_URL = process.env.TNO_V1_DB_URL;
        const PORT = process.env.TNO_V1_PORT;

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
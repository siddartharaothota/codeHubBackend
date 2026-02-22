require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const os = require("os");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==============================
// MongoDB Connection
// ==============================

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI);

mongoose.connection.once("open", () => {
  console.log("MongoDB Atlas Connected ✅");
});

// ==============================
// Schemas
// ==============================

// USERS
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const User = mongoose.model("User", userSchema);

// FILES
const fileSchema = new mongoose.Schema({
  filename: String,
  data: Buffer,
  contentType: String,
});

const File = mongoose.model("File", fileSchema);

// CHAT
const chatSchema = new mongoose.Schema({
  user: String,
  text: String,
});

const Chat = mongoose.model("Chat", chatSchema);

// ==============================
// Multer (Memory Storage)
// ==============================

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ==============================
// Get Local IP
// ==============================

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (let name in interfaces) {
    for (let net of interfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
}

// ==============================
// USERS ROUTES (Same as old)
// ==============================

app.get("/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  await User.create({ username, password });
  res.json({ message: "User created" });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username, password });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json(user);
});

// ==============================
// FILE ROUTES (Same endpoints)
// ==============================

// GET all files
app.get("/files", async (req, res) => {
  const files = await File.find().select("-data");
  res.json(files.map(f => f.filename));
});

// UPLOAD
app.post("/upload", upload.single("file"), async (req, res) => {
  const username = req.body.username;

  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }

  const newFileName = `${username}:${req.file.originalname}`;

  await File.create({
    filename: newFileName,
    data: req.file.buffer,
    contentType: req.file.mimetype,
  });

  res.json({ message: "File uploaded successfully" });
});

// DOWNLOAD (by filename like before)
app.get("/download/:name", async (req, res) => {
  const file = await File.findOne({ filename: req.params.name });

  if (!file) {
    return res.status(404).json({ error: "File not found" });
  }

  res.attachment(file.filename);
  res.type(file.contentType);
  res.send(file.data);
});

// DELETE (by filename like before)
app.delete("/delete/:name", async (req, res) => {
  await File.findOneAndDelete({ filename: req.params.name });
  res.json({ message: "File deleted" });
});

// ==============================
// CHAT ROUTES (Same as old)
// ==============================

app.get("/chat", async (req, res) => {
  const messages = await Chat.find();
  res.json(messages);
});

app.post("/chat", async (req, res) => {
  const { user, text } = req.body;

  if (!user || !text) {
    return res.status(400).json({ error: "Invalid message" });
  }

  await Chat.create({ user, text });
  res.json({ success: true });
});

// ==============================
// Start Server
// ==============================

app.listen(PORT, "0.0.0.0", () => {
  const ip = getLocalIP();
  console.log("Server running at:");
  console.log(`Local:           http://localhost:${PORT}`);
  console.log(`On Wifi Network: http://${ip}:${PORT}`);
});
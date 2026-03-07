import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import conflictsRouter from "./routes/conflicts";
import cors from "cors";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.use("/api/conflicts", conflictsRouter);

const clientBuildPath = path.join(__dirname, "../../client-build");
app.use(express.static(clientBuildPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"));
});

const activeConnections = new Set<string>();
let broadcastInterval: NodeJS.Timeout | null = null;

async function fetchAndBroadcast() {
  try {
    const response = await fetch('http://localhost:8080/api/conflicts');
    const data = await response.json();
    io.emit('conflicts:update', data);
  } catch (error) {
    console.error('Error fetching conflicts:', error);
  }
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  activeConnections.add(socket.id);

  if (activeConnections.size === 1 && !broadcastInterval) {
    broadcastInterval = setInterval(fetchAndBroadcast, 30000);
    fetchAndBroadcast();
  }

  socket.on('conflicts:subscribe', () => {
    socket.emit('conflicts:data', { events: [] });
  });

  socket.on('conflicts:refresh', async () => {
    await fetchAndBroadcast();
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    activeConnections.delete(socket.id);
    
    if (activeConnections.size === 0 && broadcastInterval) {
      clearInterval(broadcastInterval);
      broadcastInterval = null;
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
  console.log(`WebSocket server ready`);
});

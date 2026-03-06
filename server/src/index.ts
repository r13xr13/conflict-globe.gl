import express from "express";
import path from "path";
import conflictsRouter from "./routes/conflicts";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.use("/api/conflicts", conflictsRouter);

const clientBuildPath = path.join(__dirname, "../../client-build");
app.use(express.static(clientBuildPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

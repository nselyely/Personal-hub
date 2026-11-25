import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import apiRouter from "./routes/api.js";

const app = express();
const port = Number(process.env.PORT || 5000);

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "14mb" }));
app.use("/api", apiRouter);

app.use((error, _request, response, _next) => {
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
  if (status >= 500) console.error(error);
  response.status(status).json({
    error: error.expose ? error.message : "An unexpected server error occurred.",
  });
});

app.listen(port, () => {
  console.log(`Family Hub API listening on port ${port}`);
});

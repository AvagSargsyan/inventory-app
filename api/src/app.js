import express from "express";
import cors from "cors";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { PUBLIC_PREFIX, UPLOAD_DIR } from "./lib/storage.js";

export const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

// Outside /api: these are files, not resources. Names are never reused, so the
// response can be cached indefinitely.
app.use(
  PUBLIC_PREFIX,
  express.static(UPLOAD_DIR, {
    maxAge: "1y",
    immutable: true,
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  }),
);

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

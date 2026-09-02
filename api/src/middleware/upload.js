import multer from "multer";
import { validationFailed } from "../lib/errors.js";

const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 2 * 1024 * 1024;

// Memory storage, not disk: the bytes can be checked before anything is
// written, so a rejected upload never leaves a file to clean up.
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
}).single("image");

const SIGNATURES = [
  { extension: "jpg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    extension: "png",
    matches: (b) => b.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")),
  },
  {
    extension: "webp",
    matches: (b) =>
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

// The declared Content-Type is client-controlled, so the real type is read from
// the file's own leading bytes.
export function verifyImage(req, _res, next) {
  if (!req.file) return next();

  const signature = SIGNATURES.find(({ matches }) => matches(req.file.buffer));
  if (!signature) {
    return next(validationFailed({ image: "Image must be a JPEG, PNG or WebP file." }));
  }

  req.file.extension = signature.extension;
  next();
}

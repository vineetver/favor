import { z } from "zod";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(50000), // Increased limit for assistant responses with tool outputs
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.enum(["image/jpeg", "image/png"]),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

const messageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  parts: z.array(partSchema),
});

export const postRequestBodySchema = z.object({
  id: z.string().min(1),
  messages: z.array(messageSchema),
  selectedChatModel: z.string().min(1),
  selectedVisibilityType: z.enum(["public", "private"]),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;

import { z } from "zod";

export const FetchCurrentDateTimeSchema = z.object({
  userTimezone: z
    .string()
    .optional()
    .describe("User's timezone (auto-detected if not provided)"),
});

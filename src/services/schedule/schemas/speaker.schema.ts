import { z } from "zod";

export const GetSpeakerInfoSchema = z.object({
  speakerName: z
    .string()
    .describe("The name of the speaker to get information about"),
});

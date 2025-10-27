import { tool } from "@langchain/core/tools";
import { DEVCONNECT_INFO } from "@/constants";

export const fetchDevConnectInfo = tool(
  () => {
    return DEVCONNECT_INFO;
  },
  {
    name: "FetchBasecampInfo",
    description:
      "Provides all available information about DevConnect 2025 based on the official website",
  }
);

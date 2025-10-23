import { tool } from "@langchain/core/tools";
import { BASECAMP_URL } from "@/constant.js";

export const fetchBasecampInfo = tool(
  () => {
    return `DevConnect 2025 Information:

Event Location: Buenos Aires, Argentina
Event Dates: November 15-23, 2025
Main Venue: La Rural (Devconnect Cube / World's Fair)

📅 EVENT OVERVIEW:
• November 15-16: Pre-events (Staking Summit, Governance Day, Ethereum Cypherpunk Congress)
• November 17: ETH Day & DevConnect Cube Opening Ceremony - World's Fair begins at La Rural
• November 18-22: DevConnect Cube at La Rural with multiple sub-events and conferences
• November 21-23: ETHGlobal Hackathon

🎫 TICKETS:
• Events at La Rural require a World's Fair ticket to enter
• Many sub-events require additional registration or tickets
• Check the calendar for specific event requirements

🏛️ MAJOR TRACKS:
• Staking & Infrastructure
• Governance & Protocol Development
• Privacy & Security (zkID, zkTLS, Encryption)
• DeFi & Payments
• Developer Tools & Client Development
• Community & Education

🌍 VENUE TYPES:
• World's Fair (La Rural) - Main DevConnect Cube venue
• Community Events - Throughout Buenos Aires

For complete details, event listings, and tickets: ${BASECAMP_URL}`;
  },
  {
    name: "FetchBasecampInfo",
    description:
      "Provides all available information about DevConnect 2025 based on the official website",
  },
);

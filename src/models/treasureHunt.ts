import pool from "../config/db.js";

// TREASURE HUNT CONFIGURATION
export const TREASURE_HUNT_CONFIG = {
  totalGroups: 20,
  totalTasks: 10,
  maxMembersPerGroup: 10,
  minConfidenceThreshold: 60, // 60% confidence required for validation
};

// Task definitions - 10 challenges for the treasure hunt
export const TREASURE_HUNT_TASKS = [
  {
    index: 0,
    title: "The Hand of God",
    description: "In the streets of Buenos Aires, find the mural of the man who touched the sky with his left foot. The artist who painted the impossible goal.",
    validationPrompt: "Does this image show a mural, painting, or street art depicting Diego Maradona? Look for artwork featuring the famous Argentine footballer.",
    hint: "Look for street art honoring the greatest footballer Argentina ever produced!",
    points: 10,
  },
];

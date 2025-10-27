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
    taskIndex: 0,
    title: "The Hand of God",
    description:
      "In the streets of Buenos Aires, find the mural of the man who touched the sky with his left foot. The artist who painted the impossible goal.",
    validationPrompt:
      "Does this image show a mural, painting, or street art depicting Diego Maradona? Look for artwork featuring the famous Argentine footballer.",
    hint: "Look for street art honoring the greatest footballer Argentina ever produced!",
    points: 10,
  },
  {
    taskIndex: 1,
    title: "Find a Spoon",
    description: "Take a photo of a spoon",
    validationPrompt:
      "Does this img clearly show a spoon? Respond with YES or NO.",
    hint: "Right next to the forks!",
    points: 10,
  },
  {
    taskIndex: 2,
    title: "Find a Pork",
    description: "Take a photo of a fork",
    validationPrompt:
      "Does this image clearly show a fork? Respond with YES or NO.",
    hint: "Right next to the poons!",
    points: 10,
  },
  {
    taskIndex: 3,
    title: "Find a Cup",
    description: "Take a photo of a cup or mug",
    validationPrompt:
      "Does this image clearly show a cup, mug, or drinking vessel? Respond with YES or NO.",
    hint: "Perfect for coffee or tea!",
    points: 10,
  },
  {
    taskIndex: 4,
    title: "Find a Plate",
    description: "Take a photo of a plate or dish",
    validationPrompt:
      "Does this image clearly show a plate, dish, or flatware? Respond with YES or NO.",
    hint: "Round and flat, perfect for serving!",
    points: 10,
  },
  {
    taskIndex: 5,
    title: "Find a Knife",
    description: "Take a photo of a knife",
    validationPrompt:
      "Does this image clearly show a knife or cutting utensil? Respond with YES or NO.",
    hint: "Sharp and pointy, perfect for cutting!",
    points: 10,
  },
];

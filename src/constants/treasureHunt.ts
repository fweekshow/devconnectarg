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
    title: "Find JesseXBT at A0x Demo",
    description:
      "Find JesseXBT at the A0x Demo at the XMTP Stage! A0x is demoing at 10am on Wednesday 11/19. Look for an artistic blue and yellow logo - the AI twin of Jesse Pollak.",
    validationPrompt:
      "Does this image show an artistic blue and yellow geometric or cubist-style logo/portrait? It should be a stylized face or figure in blue and yellow tones, resembling modern digital art or an AI-generated portrait. Look for geometric patterns, angular shapes, and a combination of blue and yellow colors forming a face or human figure.",
    hint: "XMTP Stage, Wednesday 11/19 at 10am. Look for the blue and yellow geometric art!",
    points: 10,
  },
  {
    taskIndex: 1,
    title: "The Hand of God",
    description:
      "In the streets of Buenos Aires, find the mural of the man who touched the sky with his left foot. The artist who painted the impossible goal.",
    validationPrompt:
      "Does this image show a mural, painting, or street art depicting Diego Maradona? Look for artwork featuring the famous Argentine footballer.",
    hint: "Look for street art honoring the greatest footballer Argentina ever produced!",
    points: 10,
  },
  {
    taskIndex: 2,
    title: "Find a Spoon",
    description: "Take a photo of a spoon",
    validationPrompt:
      "Does this img clearly show a spoon? Respond with YES or NO.",
    hint: "Right next to the forks!",
    points: 10,
  },
  {
    taskIndex: 3,
    title: "Find a Fork",
    description: "Take a photo of a fork",
    validationPrompt:
      "Does this image clearly show a fork? Respond with YES or NO.",
    hint: "Right next to the spoons!",
    points: 10,
  },
  {
    taskIndex: 4,
    title: "Find a Cup",
    description: "Take a photo of a cup or mug",
    validationPrompt:
      "Does this image clearly show a cup, mug, or drinking vessel? Respond with YES or NO.",
    hint: "Perfect for coffee or tea!",
    points: 10,
  },
  {
    taskIndex: 5,
    title: "Find a Plate",
    description: "Take a photo of a plate or dish",
    validationPrompt:
      "Does this image clearly show a plate, dish, or flatware? Respond with YES or NO.",
    hint: "Round and flat, perfect for serving!",
    points: 10,
  },
  {
    taskIndex: 6,
    title: "Find a Knife",
    description: "Take a photo of a knife",
    validationPrompt:
      "Does this image clearly show a knife or cutting utensil? Respond with YES or NO.",
    hint: "Sharp and pointy, perfect for cutting!",
    points: 10,
  },
  {
    taskIndex: 7,
    title: "TBD Challenge 8",
    description: "Challenge details coming soon!",
    validationPrompt:
      "Placeholder validation prompt.",
    hint: "Details to be announced!",
    points: 10,
  },
  {
    taskIndex: 8,
    title: "TBD Challenge 9",
    description: "Challenge details coming soon!",
    validationPrompt:
      "Placeholder validation prompt.",
    hint: "Details to be announced!",
    points: 10,
  },
  {
    taskIndex: 9,
    title: "TBD Challenge 10",
    description: "Challenge details coming soon!",
    validationPrompt:
      "Placeholder validation prompt.",
    hint: "Details to be announced!",
    points: 10,
  },
];

export const TREASURE_HUNT_GROUP_IDS: string[] = [
  // Test group
  "8b2d7fa9abf1190436f59131c6e2ec90",
  // Treasure Hunt Group #1
  "fad3cb00979306b8bc3a428b4420fb2f",
  // Remaining 18 groups to be added
  // "group_id_3",
  // "group_id_4",
  // ... up to 20
];
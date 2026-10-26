import type { Room, RoomId } from "@/lib/types";

// One scene: the warm wood-and-lamplight table from the concept art.
export const ROOMS: Record<RoomId, Room> = {
  boardroom: {
    id: "boardroom",
    name: "Symposium",
    tagline: "An ancient Greek dinner table, lamps lit, wine poured, and a modern question on it.",
    // The five who clash most: the mean, the cynic, the gardener, the river, the numbers.
    defaultSeats: ["aristotle", "diogenes", "epicurus", "heraclitus", "pythagoras"],
    opening: "The lamps are lit, the wine is poured, and the philosophers are curious about your century. What's on your mind?",
    // One modern question per framework: a yes/no, a choice, an already-made decision.
    examples: [
      "Should I quit my job to become a full-time content creator?",
      "Delete Instagram, go private, or keep posting?",
      "I've decided to move in with my partner after 3 months. What will go wrong?",
    ],
  },
};

export const ROOM: Room = ROOMS.boardroom;

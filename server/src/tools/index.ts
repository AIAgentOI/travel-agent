import { geocode } from "./geocode.js";
import { weather } from "./weather.js";
import { attractions } from "./attractions.js";
import { budget } from "./budget.js";
import { createUpdateProfileTool, type SaveProfile } from "./profile.js";

// Factory so updateProfile can close over how the profile is persisted -
// the chat route binds it to the authenticated user's Postgres row, evals
// bind it to an in-memory recorder. V3 (validators) extends this further.
export function createTravelTools(saveProfile: SaveProfile) {
  return {
    geocode,
    weather,
    attractions,
    budget,
    updateProfile: createUpdateProfileTool(saveProfile),
  };
}

export type TravelTools = ReturnType<typeof createTravelTools>;

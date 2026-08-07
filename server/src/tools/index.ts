import { geocode } from "./geocode.js";
import { weather } from "./weather.js";
import { attractions } from "./attractions.js";
import { budget } from "./budget.js";
import { createUpdateProfileTool } from "./profile.js";

// Factory so updateProfile can close over the authenticated user's id -
// V2 (memory tools) and V3 (validators) extend this
export function createTravelTools(userId: string) {
  return {
    geocode,
    weather,
    attractions,
    budget,
    updateProfile: createUpdateProfileTool(userId),
  };
}

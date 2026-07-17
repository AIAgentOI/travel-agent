import { geocode } from "./geocode.js";
import { weather } from "./weather.js";
import { attractions } from "./attractions.js";
import { budget } from "./budget.js";
import { updateProfile } from "./profile.js";

// Single tool set object - V2 (memory tools) and V3 (validators) extend this
export const travelTools = {
  geocode,
  weather,
  attractions,
  budget,
  updateProfile,
};

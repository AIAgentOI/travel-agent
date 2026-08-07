import { Router } from "express";
import { getProfile, replaceProfile, type TravelerProfile } from "../profile.js";

export const profileRouter = Router();

profileRouter.get("/profile", async (_req, res) => {
  res.json((await getProfile()) ?? {});
});

profileRouter.put("/profile", async (req, res) => {
  const body = req.body as TravelerProfile;
  const interests = Array.isArray(body.interests)
    ? body.interests.map((s) => String(s).trim()).filter(Boolean)
    : [];
  const travelers = Number(body.travelers);
  const profile = await replaceProfile({
    budgetStyle: body.budgetStyle?.trim() || undefined,
    interests: interests.length ? interests : undefined,
    pace: body.pace?.trim() || undefined,
    travelers: Number.isInteger(travelers) && travelers > 0 ? travelers : undefined,
  });
  res.json(profile);
});

import type { RequestHandler } from "express";
import { storage } from "./storage";

export const requireSubscription: RequestHandler = async (req: any, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.claims.sub;
    
    const subscription = await storage.getUserSubscriptionByUserId(userId);
    
    if (!subscription) {
      return res.status(403).json({ message: "Subscription required" });
    }
    
    if (subscription.status !== 'active') {
      return res.status(403).json({ message: "Subscription required" });
    }
    
    if (subscription.currentPeriodEnd && new Date() > subscription.currentPeriodEnd) {
      return res.status(403).json({ message: "Subscription expired" });
    }
    
    next();
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

import type { RequestHandler } from "express";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getFirebaseProjectId(): string {
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is not configured.");
  }

  return projectId;
}

if (!getApps().length) {
  initializeApp({
    projectId: getFirebaseProjectId(),
  });
}

type AuthLocals = { authUserId?: string };

export const requireFirebaseAuth: RequestHandler<
  unknown,
  unknown,
  unknown,
  unknown,
  AuthLocals
> = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      valid: false,
      message: "Authorization token is required.",
    });
    return;
  }

  const idToken = authorization.slice("Bearer ".length).trim();

  if (!idToken) {
    res.status(401).json({
      valid: false,
      message: "Authorization token is required.",
    });
    return;
  }

  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    res.locals.authUserId = decoded.uid;
    next();
  } catch {
    res.status(401).json({
      valid: false,
      message: "Invalid or expired authorization token.",
    });
  }
};

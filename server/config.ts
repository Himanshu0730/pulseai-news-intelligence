import dotenv from "dotenv";

dotenv.config();

const parseEnvInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production");
}

export const config = {
  port: parseEnvInt(process.env.PORT, 3000),
  jwtSecret: process.env.JWT_SECRET || "development-only-secret",
  jwtExpiresIn: "7d",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  newsApiKey: process.env.NEWS_API_KEY || "",
  gnewsApiKey: process.env.GNEWS_API_KEY || "",
  hfApiKey: process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || "",
  databaseUrl: process.env.DATABASE_URL || "",
  nodeEnv: process.env.NODE_ENV || "development",
  guestArticleLimit: parseEnvInt(process.env.GUEST_ARTICLE_LIMIT, 10),
  guestSearchLimit: parseEnvInt(process.env.GUEST_SEARCH_LIMIT, 5),
  guestAiLimit: parseEnvInt(process.env.GUEST_AI_LIMIT, 3),
};

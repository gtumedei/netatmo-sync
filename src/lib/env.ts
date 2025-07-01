import { z, ZodFormattedError } from "zod"

// Load environment variables
import "dotenv/config"

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  TURSO_DB_URL: z.string().url(),
  TURSO_DB_TOKEN: z.string(),
  CRON_SECRET: z.string(),
})

const formatErrors = (errors: ZodFormattedError<Map<string, string>, string>) =>
  Object.entries(errors)
    .map(([name, value]) => {
      return value && "_errors" in value ? `${name}: ${value._errors.join(", ")}\n` : false
    })
    .filter(Boolean)

// Parse environment variables

const parseRes = EnvSchema.safeParse(process.env)

if (!parseRes.success) {
  console.error("Invalid environment variables\n", ...formatErrors(parseRes.error.format()))
  throw new Error("Invalid environment variables")
}

export const env = parseRes.data

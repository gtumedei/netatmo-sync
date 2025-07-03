import { drizzle } from "drizzle-orm/libsql"
import { env } from "~/lib/env"

export const db = drizzle({
  connection: {
    url: env.DATABASE_URL,
  },
})

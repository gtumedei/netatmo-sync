import { db } from "~/db"
import { Tokens } from "~/db/schema"
import { logger } from "~/lib/logger"

export type TokenPair = {
  accessToken: string
  refreshToken: string
}

export const loadTokens = async () => {
  logger.i("Loading tokens")
  const tokens = (await db.select().from(Tokens).limit(1))[0]
  if (!tokens) throw new Error("Missing database auth token record.")
  return tokens
}

export const storeTokens = async (tokens: TokenPair) => {
  logger.i("Storing tokens")
  await db.update(Tokens).set(tokens)
}

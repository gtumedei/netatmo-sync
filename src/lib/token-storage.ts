import { db } from "~/db"
import { Tokens } from "~/db/schema"
import { logger } from "~/lib/logger"

export type TokenPair = {
  accessToken: string
  refreshToken: string
}

export const loadTokens = async () => {
  logger.i("Loading tokens")
  const record = (await db.select().from(Tokens).limit(1))[0]
  if (!record) throw new Error("Missing database auth token record.")
  const { accessToken, refreshToken, updatedAt } = record
  const res = {
    tokens: { accessToken, refreshToken },
    updatedAt: new Date(updatedAt + "Z"),
  }
  return res
}

export const storeTokens = async (tokens: TokenPair) => {
  logger.i("Storing tokens")
  await db.update(Tokens).set(tokens)
}

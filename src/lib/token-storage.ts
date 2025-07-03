import fs from "fs/promises"
import { z } from "zod"

const TOKEN_FILENAME = "./tokens.json"

const TokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})

type TokenPair = z.infer<typeof TokenPairSchema>

export const loadTokens = async () => {
  const content = await fs.readFile(TOKEN_FILENAME, "utf-8")
  const tokens = TokenPairSchema.parse(JSON.parse(content))
  return tokens
}

export const storeTokens = async (tokens: TokenPair) => {
  await fs.writeFile(TOKEN_FILENAME, JSON.stringify(tokens, null, 2))
}

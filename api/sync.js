// @ts-check
import { executeNetatmoSync } from "../dist/index.js"

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export const GET = async (request) => {
  // Check for matching CRON_SECRET
  const authHeader = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ success: false }, { status: 401 })
  }

  // Run sync
  await executeNetatmoSync()

  return Response.json({ success: true })
}

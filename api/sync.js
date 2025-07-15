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
  const { metrics } = await executeNetatmoSync()

  return metrics.errors == 0
    ? Response.json({ success: true, metrics })
    : Response.json({ success: false, metrics }, { status: 500 })
}

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

  // Check if custom dates have been passed
  const { searchParams } = new URL(request.url)
  const dateBegin = searchParams.get("date_begin")
  const dateEnd = searchParams.get("date_end")

  // Run sync
  // @ts-expect-error type inference is not working on the function parameters due to esbuild stripping types
  const { metrics } = await executeNetatmoSync({ dateBegin, dateEnd })

  return metrics.errors == 0
    ? Response.json({ success: true, metrics })
    : Response.json({ success: false, metrics }, { status: 500 })
}

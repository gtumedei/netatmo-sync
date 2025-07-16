import { env } from "~/lib/env"
import { executeNetatmoSync } from "~/sync"

/**
 * Handler to run the service locally. Its behavior can be customized via environment variables.
 */
export const netatmoSyncLocalHandler = () =>
  executeNetatmoSync({
    dateBegin: env.DATE_BEGIN,
    dateEnd: env.DATE_END,
  })

/**
 * Handler to run the service on a web server. Its behavior can be customized via search parameters.
 */
export const netatmoSyncWebHandler = async (request: Request) => {
  // Check for matching CRON_SECRET
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return Response.json({ success: false }, { status: 401 })
  }

  // Check if custom dates have been passed
  const { searchParams } = new URL(request.url)
  const dateBegin = searchParams.get("date_begin")
  const dateEnd = searchParams.get("date_end")

  // Run sync
  const { metrics } = await executeNetatmoSync({ dateBegin, dateEnd })

  return metrics.errors == 0
    ? Response.json({ success: true, metrics })
    : Response.json({ success: false, metrics }, { status: 500 })
}

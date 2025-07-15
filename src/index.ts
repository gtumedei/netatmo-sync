import dayjs from "dayjs"
import { desc } from "drizzle-orm"
import { db } from "~/db"
import { MeasurementInsert, Measurements, Sensors } from "~/db/schema"
import { env } from "~/lib/env"
import { logger } from "~/lib/logger"
import { createNetatmoApiClient, GetMeasureData, NetatmoError } from "~/lib/netatmo"
import Time from "~/lib/time"
import { loadTokens, storeTokens } from "~/lib/token-storage"

export const executeNetatmoSync = async () => {
  logger.clearHistory()

  let tokens = await loadTokens()
  logger.s("Loaded tokens from the file system")

  const sensors = await db.select().from(Sensors)
  logger.s(`Loaded the list of sensors from the database (${sensors.length} items)`)

  const netatmo = createNetatmoApiClient({
    clientId: env.NETATMO_CLIENT_ID,
    clientSecret: env.NETATMO_CLIENT_SECRET,
  })
  logger.i("Netatmo API client created")

  // Fetch data from the past 2 hours (e.g. if running at 10:30 it will fetch data from 8:00:00.000 to 9:59:59.999)
  const dateBegin = dayjs().startOf("hour").subtract(2, "hour").toDate()
  const dateEnd = dayjs().startOf("hour").subtract(1, "millisecond").toDate()
  logger.i(`Fetching data from ${dateBegin.toISOString()} to ${dateEnd.toISOString()}`)

  const types = ["temperature", "humidity", "CO2", "noise", "pressure"] as const

  // For each sensor
  for (const sensor of sensors) {
    logger.i(`Fetching data for sensor "${sensor.name}" (ID: ${sensor.id})`)

    const latestData: { [K in (typeof types)[number]]: GetMeasureData | null } = {
      temperature: null,
      humidity: null,
      CO2: null,
      noise: null,
      pressure: null,
    }

    for (const type of types) {
      logger.i(`Fetching "${type}" data`)

      let attempts = 0
      let tokenWasExpired = false

      do {
        logger.i(`Attempt n°${attempts + 1}`)
        try {
          // Fetch the latest data from Netatmo
          latestData[type] = await netatmo.aircare.getMeasure({
            accessToken: tokens.accessToken,
            deviceId: sensor.id,
            scale: "max",
            type,
            dateBegin,
            dateEnd,
            optimize: false,
            realtime: false,
          })
          const recordCount = Object.keys(latestData[type].body).length
          logger.s(`Data fetched successfully (${recordCount} records)`)
        } catch (err) {
          console.error(err)
          if (err instanceof NetatmoError && err.status == 403) {
            // If data fetching fails because of an expired access token, renew it and retry
            logger.w("Auth error: re-authenticating")
            try {
              const newTokens = await netatmo.authentication.refresh({
                refreshToken: tokens.refreshToken,
              })
              await storeTokens(newTokens)
              tokens = newTokens
              tokenWasExpired = true
              logger.s("Re-authentication completed successfully")
            } catch (err2) {
              logger.e("Re-authentication failed\n", err2)
            }
          } else {
            // If data fetching fails because of some other errors, wait 300ms and retry up to two times
            logger.e(err instanceof NetatmoError ? "Known error" : "Unknown error")
            await new Promise((r) => setTimeout(r, 300))
          }
        }
        attempts++
      } while (!latestData[type] && (attempts < 3 || (tokenWasExpired && attempts < 4)))

      if (!latestData[type]) logger.e(`Failed to fetch "${type}" data`)
    }

    // Gather timestamps across all types. This shouldn't be necessary as the timestamps should match exactly across different types, but we found no documentation about this behavior, so it's better not to make any assumptions.

    const getTimestamps = (data: GetMeasureData | null) =>
      Object.keys(data?.body ?? {}).map((timestamp) => Number(timestamp))

    const timestamps = [
      ...types.reduce((acc, type) => {
        getTimestamps(latestData[type]).forEach((timestamp) => acc.add(timestamp))
        return acc
      }, new Set<number>()),
    ].sort()

    logger.i(`There are ${timestamps.length} timestamps`)
    for (const type of types) {
      if (timestamps.length != getTimestamps(latestData[type]).length) {
        logger.e(`Measurements are missing for type ${type}`)
      }
    }

    // Merge fetched data types into a single row for each timestamp
    const dataRows: MeasurementInsert[] = timestamps.map((timestamp) => ({
      sensorId: sensor.id,
      timestamp: new Date(timestamp * 1000),
      temperature: latestData.temperature?.body[timestamp]?.[0],
      humidity: latestData.humidity?.body[timestamp]?.[0],
      CO2: latestData.CO2?.body[timestamp]?.[0],
      noise: latestData.noise?.body[timestamp]?.[0],
      pressure: latestData.pressure?.body[timestamp]?.[0],
    }))

    const MAX_TIME_BETWEEN_MEASUREMENTS = Time.Minute * 15

    // Make sure there are no gaps greater than 15 minutes in the fetched data
    for (let i = 1; i < dataRows.length; i++) {
      const currRow = dataRows[i]!
      const prevRow = dataRows[i - 1]!
      const diff = dayjs(currRow.timestamp).diff(prevRow.timestamp)
      if (diff > MAX_TIME_BETWEEN_MEASUREMENTS) {
        logger.e(
          `There are no measurements between ${prevRow.timestamp.toISOString()} and ${currRow.timestamp.toISOString()}`
        )
      }
    }

    // Make sure there is no gap between the fetched data and what's stored in the db
    const [latestDbMeasurement] = await db
      .select()
      .from(Measurements)
      .orderBy(desc(Measurements.timestamp))
      .limit(1)
    const firstDataRow = dataRows[0]
    if (latestDbMeasurement && firstDataRow) {
      const diff = Math.abs(dayjs(latestDbMeasurement.timestamp).diff(firstDataRow.timestamp))
      if (
        dayjs(latestDbMeasurement.timestamp).isBefore(firstDataRow.timestamp) &&
        diff > MAX_TIME_BETWEEN_MEASUREMENTS
      ) {
        logger.e(
          `There are no measurements between ${latestDbMeasurement.timestamp.toISOString()} (most recent record in the database) and ${firstDataRow.timestamp.toISOString()} (least recent fetched row)`
        )
      }
    }

    // Store the fetched data in the db, avoiding duplicates
    logger.i("Storing data in the database")
    const res = await db.insert(Measurements).values(dataRows).onConflictDoNothing()
    logger.s(
      `Successfully inserted ${res.rowsAffected} new records (${
        dataRows.length - res.rowsAffected
      } entries were already in the database)`
    )
  }

  const metrics = {
    warnings: logger.history.w.length,
    errors: logger.history.e.length,
  }

  // Send error email if there are any errors
  if (metrics.errors > 0) {
    // TODO
    console.log(JSON.stringify(logger.history.e, null, 2))
  }

  logger.i("Done")

  return { metrics }
}

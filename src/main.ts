import dayjs from "dayjs"
import { db } from "~/db"
import { Sensors } from "~/db/schema"
import { env } from "~/lib/env"
import { createNetatmoApiClient, NetatmoError } from "~/lib/netatmo"
import { loadTokens, storeTokens } from "~/lib/token-storage"

let tokens = await loadTokens()
console.log("Loaded tokens from the file system")

const sensors = await db.select().from(Sensors)
console.log(`Loaded the list of sensors from the database (${sensors.length} items)`)

const netatmo = createNetatmoApiClient({
  clientId: env.NETATMO_CLIENT_ID,
  clientSecret: env.NETATMO_CLIENT_SECRET,
})
console.log("Netatmo API client created")

// Fetch data from the past hour (e.g. if running at 10:30 it will fetch data from 9:00:00.000 to 9:59:59.999)
const dateBegin = dayjs().startOf("hour").subtract(1, "hour").toDate()
const dateEnd = dayjs().startOf("hour").subtract(1, "millisecond").toDate()
console.log(`Fetching data from ${dateBegin.toISOString()} to ${dateEnd.toISOString()}`)

// For each sensor
for (const sensor of sensors) {
  console.log(`Fetching data for sensor "${sensor.name}" (ID: ${sensor.id})`)
  let tentatives = 0
  let tokenWasExpired = false
  let latestData: any = null

  do {
    console.log(`Tentative n°${tentatives + 1}`)
    try {
      // Fetch the latest data from Netatmo
      latestData = await netatmo.aircare.getMeasure({
        accessToken: tokens.accessToken,
        deviceId: sensor.id,
        scale: "30min", // TODO: test "max" scale, not guaranteed to work but should return data in intervals of 5 minutes
        types: ["temperature", "humidity", "CO2", "noise", "pressure"],
      })
    } catch (err) {
      console.error(err)
      if (err instanceof NetatmoError && err.status == 403) {
        // If data fetching fails because of an expired access token, renew it and retry
        console.log("Auth error: re-authenticating")
        try {
          const newTokens = await netatmo.authentication.refresh({
            refreshToken: tokens.refreshToken,
          })
          await storeTokens(newTokens)
          tokens = newTokens
          tokenWasExpired = true
          console.log("Re-authentication completed successfully")
        } catch (err2) {
          console.log("Re-authentication failed")
          console.error(err2)
        }
      } else {
        // If data fetching fails because of some other errors, wait 300ms and retry up to two times
        console.log(err instanceof NetatmoError ? "Known error" : "Unknown error")
        await new Promise((r) => setTimeout(r, 300))
      }
    }
    tentatives++
  } while (!latestData && (tentatives < 3 || (tokenWasExpired && tentatives < 4)))

  console.log(latestData)

  /* if (!latestData) {
    errorLog.push({ sensorId: sensor.id, message: tokenWasExpired ? "Data" : "" })
    continue
  } */

  // Make sure there are no gaps in the fetched data
  // Make sure there is no gap between the fetched data and what's stored in the db
  // Store the fetched data in the db, avoiding duplicates
}

// Send error email if there are any errors

console.log("Done")

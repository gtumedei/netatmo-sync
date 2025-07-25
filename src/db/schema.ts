import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const Sensors = sqliteTable("sensors", {
  id: text().primaryKey(),
  name: text(),
})

export const Measurements = sqliteTable(
  "measurements",
  {
    sensorId: text()
      .notNull()
      .references(() => Sensors.id),
    timestamp: integer({ mode: "timestamp" }).notNull(),
    temperature: real(),
    humidity: integer(),
    CO2: integer(),
    noise: integer(),
    pressure: real(),
  },
  (table) => [primaryKey({ columns: [table.sensorId, table.timestamp] })]
)

export type MeasurementInsert = typeof Measurements.$inferInsert

export const Tokens = sqliteTable(
  "token",
  {
    accessToken: text().notNull(),
    refreshToken: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.accessToken, table.refreshToken] })]
)

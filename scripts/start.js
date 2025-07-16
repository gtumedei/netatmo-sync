// @ts-check
import { netatmoSyncLocalHandler } from "../dist/index.js"

const res = await netatmoSyncLocalHandler()

console.log(res)

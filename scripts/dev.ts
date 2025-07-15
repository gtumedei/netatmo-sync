import { executeNetatmoSync } from "../src"

const dateBegin = process.env.DATE_BEGIN
const dateEnd = process.env.DATE_END

const res = await executeNetatmoSync({ dateBegin, dateEnd })

console.log(res)

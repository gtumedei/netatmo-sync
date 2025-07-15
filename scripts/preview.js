// @ts-check
import { executeNetatmoSync } from "../dist/index.js"

const dateBegin = process.env.DATE_BEGIN
const dateEnd = process.env.DATE_END

// @ts-expect-error Type inference is not working on the function parameters due to esbuild stripping types
const res = await executeNetatmoSync({ dateBegin, dateEnd })

console.log(res)

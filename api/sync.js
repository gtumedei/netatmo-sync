import { run } from "../dist/index.js"

const handler = async (req) => {
  const res = await run()
  return Response.json(res)
}

export default handler

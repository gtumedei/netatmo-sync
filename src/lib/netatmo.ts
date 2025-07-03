const BASE_API_URL = "https://api.netatmo.com"

export type NetatmoApiClient = {
  authentication: {
    refresh: (params: {
      refreshToken: string
    }) => Promise<{ accessToken: string; refreshToken: string }>
  }
  aircare: {
    getMeasure: (params: {
      accessToken: string
      deviceId: string
      scale: "max" | "30min" | "1hour" | "3hours" | "1day" | "1week" | "1month"
      types: ("temperature" | "humidity" | "CO2" | "noise" | "pressure")[]
      dateBegin?: Date
      dateEnd?: Date
      limit?: number
      optimize?: boolean
      realtime?: boolean
    }) => any
  }
}

export const createNetatmoApiClient = (clientParams: {
  clientId: string
  clientSecret: string
}): NetatmoApiClient => {
  return {
    authentication: {
      refresh: async (params) => {
        const searchParams = new URLSearchParams()
        searchParams.append("grant_type", "refresh_token")
        searchParams.append("refresh_token", params.refreshToken)
        searchParams.append("client_id", clientParams.clientId)
        searchParams.append("client_secret", clientParams.clientSecret)

        const res = await fetch(`${BASE_API_URL}/oauth2/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          },
          body: searchParams.toString(),
        })
        if (!res.ok)
          throw new NetatmoError({
            status: res.status,
            body: (await res.json().catch(() => null)) as any,
          })
        const data = (await res.json()) as {
          access_token: string
          refresh_token: string
          expires_in: number
          expire_in: number
          scope: string[]
        }

        return { accessToken: data.access_token, refreshToken: data.refresh_token }
      },
    },
    aircare: {
      getMeasure: async (params) => {
        const searchParams = new URLSearchParams()
        searchParams.append("device_id", params.deviceId)
        searchParams.append("scale", params.scale)
        for (const type of params.types) {
          searchParams.append("type", type)
        }
        if (params.dateBegin)
          searchParams.append("date_begin", `${Math.floor(+params.dateBegin / 1000)}`)
        if (params.dateEnd) searchParams.append("date_end", `${Math.floor(+params.dateEnd / 1000)}`)
        if (params.limit) searchParams.append("limit", `${params.limit}`)
        if (params.optimize) searchParams.append("optimize", "true")
        if (params.realtime) searchParams.append("realtime", "true")

        const res = await fetch(`${BASE_API_URL}/api/getmeasure?${searchParams.toString()}`, {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${params.accessToken}`,
          },
        })
        if (!res.ok)
          throw new NetatmoError({
            status: res.status,
            body: (await res.json().catch(() => null)) as any,
          })
        const data = await res.json() // TODO: type data
        return data
      },
    },
  }
}

type NetatmoErrorPayload = { error: string | { code: number; message: string } }

export class NetatmoError extends Error {
  type: "client" | "server"
  status: number
  body?: NetatmoErrorPayload

  constructor(params: { message?: string; status: number; body?: NetatmoErrorPayload }) {
    super(params.message)
    this.status = params.status
    this.type = `${params.status}`.startsWith("4") ? "client" : "server"
    this.body = params.body
  }
}

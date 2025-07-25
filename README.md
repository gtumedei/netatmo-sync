# netatmo-sync

A service to sync [Netatmo Aircare](https://shop.netatmo.com/aircare) measurements to a database using the [Netatmo Aircare APIs](https://dev.netatmo.com/apidocumentation/aircare).

- Locally, you can run it as a script with `pnpm dev` or `pnpm start` (the latter requires a build with `pnpm build`).
- In prod, it's a web server with a single `GET /api/sync` endpoint, that requires an `Authorization` header with the value `Bearer CRON_SECRET`, where `CRON_SECRET` is an environment variable set on your hosting platform that you must match in order to run the sync process.

## Tech stack

- Language and framework: TypeScript, Node.js
- Database: SQLite on [Turso](https://turso.tech/) with Drizzle ORM
- Hosting: [Vercel](https://vercel.com/)

## Getting started

**Requirements**

- Node.js v22+
- pnpm
- A Netatmo account with a configured [Netatmo app](https://dev.netatmo.com/apps) (client ID and secret are required environment variables)
- A Turso account and database (database URL and token are required environment variables)
- (only for deployment) A Vercel account

**Process**

- Clone the repo
- Install dependencies with `pnpm i`
- `cp .env.example .env` and fill the `.env` file with your environment variables
  - `CRON_SECRET` can be any string, but a length of at least 32 characters is recommended for production deployments
- Fill the database
  - Run `pnpm db:push` to create the database and tables
  - Run `pnpm db:studio` and open the database editor in your browser
  - Add one record to the `sensors` table for each sensor you want to sync to the database
  - Add an access + refresh token pair to the `tokens` table: these are required for authentication and will be automatically renewed by the service; see the [Netatmo Auth docs](https://dev.netatmo.com/apidocumentation/oauth) for how to get them
- Run the service
  - Run in dev mode with `pnpm dev`
  - Build for production with `pnpm build`
  - Run in prod with `pnpm start`
- Deploy the service
  - If you want to deploy on Vercel, make sure to add your environment variables there too
  - If you want to run the GitHub action, you need to fork this repo and have the service deployed somewhere; you also need to set the BASE_URL environment variable and the CRON_SECRET repo secret on GitHub
- Custom sync range
  - If running locally, you can provide custom timestamps via the `DATE_BEGIN` and `DATE_END` environment variables
  - If running on a web server, you can provide them via the `date_begin` and `date_end` search parameters
  - All dates must be in ISO format (e.g. `2025-01-01T12:00:00.000Z`)

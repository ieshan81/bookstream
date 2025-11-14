# Deploying BookStream with Netlify and Supabase

This guide explains how to host the BookStream API for global access using **Netlify** for serverless execution and static hosting, and **Supabase** for the managed PostgreSQL database and object storage. The flow is:

1. Provision Supabase (database + storage bucket).
2. Configure BookStream for Supabase storage and run migrations.
3. Deploy the backend API as a Netlify Function from this repository.
4. Deploy the frontend as a static Netlify site that talks to the serverless API.

## 1. Supabase setup

1. Create a Supabase project at [supabase.com](https://supabase.com) on the `Pro` or `Free` tier.
2. In **Project Settings → Database**, copy the `Connection string` (Node.js) and store it as `DATABASE_URL`.
3. In **Project Settings → API**, copy the `project URL` (e.g. `https://xyz.supabase.co`) and the `service_role` key. The service role key is required for server-side uploads and should never be exposed to the browser.
4. Create a Storage bucket named (for example) `book-files` in **Storage → Buckets**. Enable `Public` access if you want files to be accessible without signed URLs.
5. (Optional) Create a folder (e.g. `uploads`) inside the bucket to keep uploads organised.

Record the following values for Netlify environment variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma connection string pointing to the Supabase Postgres instance. |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service key for storage uploads and Prisma. |
| `SUPABASE_BUCKET` | Storage bucket name (default `book-files`). |
| `SUPABASE_FOLDER` | Optional folder inside the bucket (default `uploads`). |
| `STORAGE_TYPE` | Set to `supabase` so BookStream uploads use Supabase Storage. |
| `JWT_SECRET` | Secret for signing API tokens. |
| `FRONTEND_URL` | The Netlify site URL that will call the API (e.g. `https://your-frontend.netlify.app`). |

## 2. Prepare the repository

```bash
# clone your fork and install dependencies
git clone <your-fork-url>
cd bookstream
npm install

# generate the Prisma client for Supabase
npm run build

# apply schema to Supabase (creates tables in the managed Postgres database)
npx prisma migrate deploy
```

Create a `.env` file with the environment variables from the table above so you can run the API locally before deploying. To exercise the Supabase storage flow locally, ensure `STORAGE_TYPE=supabase` is set.

## 3. Deploy the backend API on Netlify

1. Push your changes (including this repository’s `netlify.toml`) to GitHub.
2. In the Netlify dashboard, **Add new site → Import an existing project** and connect the repository.
3. Use the following build settings:
   - **Base directory**: leave empty (root of the repo).
   - **Build command**: `npm run build` (runs `prisma generate` so the Prisma client exists inside the function bundle).
   - **Publish directory**: `public` (this repo ships a minimal placeholder page so Netlify has a directory to publish).
4. Under **Site settings → Environment variables**, add all secrets from the Supabase setup table plus any optional values (`GOOGLE_CLIENT_ID`, etc.).
5. Netlify automatically detects `netlify/functions/server.js` and deploys it as a serverless function. All requests to `/api/*` are proxied to the function because of the `netlify.toml` redirect rule.
6. After the initial deploy, trigger **Deploy site**. Netlify exposes a URL like `https://your-backend.netlify.app`. The API lives under the same origin (e.g. `https://your-backend.netlify.app/api/books`).

### Working with Prisma on Netlify

- The `external_node_modules` setting in `netlify.toml` ensures the Prisma engine binaries are bundled.
- If you change the Prisma schema, run `npx prisma migrate deploy` locally against Supabase before pushing so the database stays in sync.

## 4. Deploy the frontend on Netlify

If your frontend lives in another repository, deploy it as a separate Netlify site. Otherwise, create a new repo with the frontend code and follow Netlify’s build instructions (for Vite/React: build command `npm run build`, publish directory `dist`). Configure the following environment variable in the frontend site:

- `VITE_API_BASE_URL=https://your-backend.netlify.app` (or a custom domain pointing to the backend site).

The frontend should send requests to `${import.meta.env.VITE_API_BASE_URL}/api/...` so you can swap environments easily.

## 5. Connect everything and go live

1. Update the backend’s `FRONTEND_URL` environment variable to the frontend Netlify domain so CORS allows browser requests.
2. Optionally add custom domains to both Netlify sites. Update `FRONTEND_URL` and the frontend `VITE_API_BASE_URL` to the custom domains.
3. Verify uploads: when `STORAGE_TYPE=supabase`, files are streamed to Supabase Storage and served via the public bucket URL returned by the API response.
4. Test OAuth login if used (Google credentials must match the Netlify backend URL).

With this setup, the entire stack runs serverlessly: Netlify serves the frontend and the Express API, Supabase hosts the database and storage, and users can access BookStream globally without managing servers.

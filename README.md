<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/eb9c6548-7d85-4b56-b5fc-d97d1150cacc

## Run Locally

**Prerequisites:** Node.js và PostgreSQL đang chạy.


1. Install dependencies:
   `npm install`
2. Create `.env` from [.env.example](.env.example), then set the PostgreSQL values:
   ```env
   SQL_HOST=localhost
   SQL_DB_NAME=qlsv_db
   SQL_USER=postgres
   SQL_PASSWORD=postgres
   ```
3. Create the database and apply the schema with your PostgreSQL tools, then run the app:
   `npm run dev`

If PostgreSQL is not running or the values in `.env` are incorrect, the server exits with a database connection error instead of starting with broken API routes.

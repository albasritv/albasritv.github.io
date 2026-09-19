# BSR Firebase -> GitHub instant sync

This helper makes catalog changes trigger GitHub Actions immediately instead of waiting for a cron schedule.

## What it watches

- /bsr_player/catalog_categories/{categoryId}
- /bsr_player/catalog_channels/{channelId}

Each write sends a repository_dispatch event named:

firebase_catalog_changed

The GitHub workflow .github/workflows/sync-firebase-to-github.yml is already configured to listen for that event.

## One-time setup

1. Create a GitHub token that can call repository dispatch for:
   albasritv/albasritv.github.io

2. From this folder, install dependencies:

   cd firebase-instant-sync/functions
   npm install

3. Return to firebase-instant-sync and set the Firebase Functions secret:

   firebase functions:secrets:set GITHUB_DISPATCH_TOKEN

4. Deploy:

   firebase deploy --only functions

## Existing GitHub secrets still required

The GitHub Action still needs:
- FIREBASE_DATABASE_URL
- FIREBASE_AUTH_TOKEN, if the database read rules require authentication

Do not put the GitHub token inside the Android app or any public web file.

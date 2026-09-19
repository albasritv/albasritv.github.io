const { onValueWritten } = require("firebase-functions/v2/database");
const { defineSecret } = require("firebase-functions/params");

const GITHUB_DISPATCH_TOKEN = defineSecret("GITHUB_DISPATCH_TOKEN");

async function triggerGitHubSync() {
  const response = await fetch(
    "https://api.github.com/repos/albasritv/albasritv.github.io/dispatches",
    {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${GITHUB_DISPATCH_TOKEN.value()}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "BSR-Firebase-Instant-Sync"
      },
      body: JSON.stringify({
        event_type: "firebase_catalog_changed"
      })
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub dispatch failed: ${response.status} ${body}`);
  }
}

exports.onCatalogCategoryChanged = onValueWritten(
  {
    ref: "/bsr_player/catalog_categories/{categoryId}",
    secrets: [GITHUB_DISPATCH_TOKEN]
  },
  async () => {
    await triggerGitHubSync();
  }
);

exports.onCatalogChannelChanged = onValueWritten(
  {
    ref: "/bsr_player/catalog_channels/{channelId}",
    secrets: [GITHUB_DISPATCH_TOKEN]
  },
  async () => {
    await triggerGitHubSync();
  }
);

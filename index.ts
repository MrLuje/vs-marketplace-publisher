import core, { getInput, setOutput, setFailed } from "@actions/core";
import github, { GitHub, context } from "@actions/github";
import { WebhookPayloadReleaseRelease } from "@octokit/webhooks";
import fs from "fs";
import fetch from "node-fetch";
import { pipeline } from "stream";
import util from "util";
const streamPipeline = util.promisify(pipeline);

async function run() {
  try {
    if (process.env.RUNNER_OS && !process.env.RUNNER_OS.toLowerCase().includes("windows"))
      setFailed("This action only works in windows runner");

    const token = getInput("github_token");
    const workspaceHome = process.env.GITHUB_WORKSPACE;
    const client = new GitHub(token);
    const releases = (await client.paginate(client.repos.listReleases.endpoint.merge(context.repo))) as WebhookPayloadReleaseRelease[];
    const release = releases[1];

    const reqInit = {
      headers: [
        ["authorization", "Bearer " + token],
        ["content-type", "application/json"],
        ["accept", "application/octet-stream"],
      ],
      follow: 0,
      redirect: "manual" as RequestRedirect,
    };
    let vsixAsset = release.assets.find((a) => a.name.toLowerCase().includes(".vsix"));
    if (!vsixAsset) setFailed("Can't find any vsix file");

    let response = await fetch(vsixAsset.url, reqInit);
    if (response.status === 302) {
      const realResourceLocation = response.headers.get("location")!;
      response = await fetch(realResourceLocation);
    }

    const filePath = workspaceHome + "/" + vsixAsset.name;
    await streamPipeline(response.body, fs.createWriteStream(filePath));

    const time = new Date().toTimeString();
    setOutput("asset_file", filePath);

    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(context.payload, undefined, 2);
    console.log(`The event payload: ${payload}`);
  } catch (error) {
    console.log("AL: error", error);
    setFailed(error.message);
  }
}

run();

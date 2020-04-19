import { getInput, setFailed, info, error } from "@actions/core";
import { GitHub, context } from "@actions/github";
import { WebhookPayloadReleaseRelease } from "@octokit/webhooks";
import util from "util";
import path from "path";
import fs from "fs";
import fetch from "node-fetch";
import { pipeline } from "stream";
const streamPipeline = util.promisify(pipeline);

export async function getLatestReleaseFile() {
  const token = getInput("github_token");
  const client = new GitHub(token);

  const releases = (await client.paginate(client.repos.listReleases.endpoint.merge(context.repo))) as WebhookPayloadReleaseRelease[];
  const release = releases.find((r) => r.assets.some((a) => a.name.toLowerCase().includes(".vsix")) && !r.draft);
  if (!release) setFailed("Can't find any release with a vsix file");
  info(`Using assets from release ${release!.id}`);

  const reqInit = {
    headers: [
      ["authorization", "Bearer " + token],
      ["content-type", "application/json"],
      ["accept", "application/octet-stream"],
    ],
    follow: 0,
    redirect: "manual" as RequestRedirect,
  };
  let vsixAsset = release!.assets.find((a) => a.name.toLowerCase().includes(".vsix"));
  if (!vsixAsset) setFailed("Can't find any vsix file");
  info(`Downloading package ${vsixAsset.name}`);

  let response = await fetch(vsixAsset.url, reqInit);
  if (response.status === 302) {
    const realResourceLocation = response.headers.get("location")!;
    response = await fetch(realResourceLocation);
  }

  const workspaceHome = process.env.GITHUB_WORKSPACE!;
  const filePath = path.join(workspaceHome, vsixAsset.name);

  await streamPipeline(response.body, fs.createWriteStream(filePath));

  if (!fs.existsSync(filePath)) error("Didn't succeed to download latest release");
  info(`Using package ${vsixAsset.name}`);

  return filePath;
}

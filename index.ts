import core from "@actions/core";
import github from "@actions/github";

try {
  // `who-to-greet` input defined in action metadata file
  const token = process.env.GITHUB_TOKEN!;
  const client = new github.GitHub(token);

  const releases = client.repos.listReleases.endpoint.merge({ page: 1 });
  console.log("AL: releases", releases);

  const time = new Date().toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2);
  console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}

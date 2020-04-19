import { getInput, setOutput, setFailed, info, error } from "@actions/core";
import github, { GitHub, context } from "@actions/github";
import { WebhookPayloadReleaseRelease } from "@octokit/webhooks";
import fs from "fs";
import fetch from "node-fetch";
import { pipeline } from "stream";
import util from "util";
import path from "path";
import { exec } from "@actions/exec";
import { ExecOptions } from "@actions/exec/lib/interfaces";
const streamPipeline = util.promisify(pipeline);

type inputs = {
  token: string;
  pat: string;
  manifestPath: string;
  vsixPath: string;
  useLatestReleaseAsset: boolean;
};

function validateInputs() {
  const inputs = {
    token: getInput("github_token", { required: true }),
    pat: getInput("pat", { required: true }),
    manifestPath: getInput("manifestPath", { required: true }),
    vsixPath: getInput("vsixPath"),
    useLatestReleaseAsset: getInput("useLatestReleaseAsset") && getInput("useLatestReleaseAsset").toLowerCase() === "true",
  } as inputs;

  if (inputs.vsixPath && inputs.useLatestReleaseAsset) {
    setFailed("Either vsixPath or useLatestReleaseAsset should be set, not both");
  }

  if (inputs.vsixPath) {
    if (!fs.existsSync(inputs.vsixPath)) setFailed(`No file at vsixPath (${inputs.vsixPath})`);
  }

  if (!inputs.manifestPath.includes("/") && !inputs.manifestPath.includes("\\")) {
    inputs.manifestPath = path.join(process.env.GITHUB_WORKSPACE!, inputs.manifestPath);
  }

  return inputs;
}

async function run() {
  try {
    CheckRunnerIsWindows();

    const inputs = validateInputs();
    var packagePath = await getPackageFilePath(inputs);

    const { manifestPath, pat } = inputs;
    await publishToMarketplace(packagePath, manifestPath, pat);
  } catch (error) {
    setFailed(error.message);
  }

  async function publishToMarketplace(vsixPath: string, manifestPath: string, personalAccessToken: string): Promise<boolean> {
    let output = "";
    let err = "";
    const options: ExecOptions = {
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        },
        stderr: (data: Buffer) => {
          err += data.toString();
        },
      },
      cwd: "C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Enterprise\\vssdk\\VisualStudioIntegration\\tools\\bin\\",
    };

    info("Publishing package to marketplace...");
    const exitCode = await exec(
      "VsixPublisher.exe",
      ["publish", "-payload", vsixPath, "-publishManifest", manifestPath, "-personalAccessToken", personalAccessToken],
      options
    );

    const success = exitCode === 0;
    if (!success) {
      error(err);
    }
    info("Successfully published package to marketplace !");

    return success;
  }

  async function getLatestReleaseFile() {
    const token = getInput("github_token");
    const client = new GitHub(token);

    const releases = (await client.paginate(client.repos.listReleases.endpoint.merge(context.repo))) as WebhookPayloadReleaseRelease[];
    const release = releases.find((r) => r.assets.some((a) => a.name.toLowerCase().includes(".vsix")));
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

  async function getPackageFilePath(inputs: inputs) {
    if (inputs.useLatestReleaseAsset) return getLatestReleaseFile();

    info(`Using ${inputs.vsixPath} as package`);
    return inputs.vsixPath;
  }

  function CheckRunnerIsWindows() {
    if (process.env.RUNNER_OS && !process.env.RUNNER_OS.toLowerCase().includes("windows"))
      setFailed("This action only works in windows runner");
  }
}

run();

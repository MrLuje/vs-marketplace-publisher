import { getInput, setFailed } from "@actions/core";
import fs from "fs";
import path from "path";

export type inputs = {
  token: string;
  pat: string;
  manifestPath: string;
  vsixPath: string;
  useLatestReleaseAsset: boolean;
};

export function validateInputs() {
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
    if (!fs.existsSync(inputs.vsixPath)) {
      inputs.vsixPath =  path.join(process.env.GITHUB_WORKSPACE!, inputs.vsixPath);
    }
    if (!fs.existsSync(inputs.vsixPath)) {
      setFailed(`No file at vsixPath (${inputs.vsixPath})`);
    }
  }

  if (!fs.existsSync(inputs.manifestPath)) {
    inputs.manifestPath = path.join(process.env.GITHUB_WORKSPACE!, inputs.manifestPath);

    if (!fs.existsSync(inputs.manifestPath)) {
      setFailed(`No file at manifestPath (${inputs.manifestPath})`);
    }
  }

  return inputs;
}

import { setFailed, info } from "@actions/core";
import { validateInputs, inputs } from "./libs/inputs";
import { getLatestReleaseFile } from "./libs/release";
import { publishToMarketplace } from "./libs/publish";

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

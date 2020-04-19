import { ExecOptions } from "@actions/exec/lib/interfaces";
import { info, setFailed } from "@actions/core";
import util from "util";
import { execFile } from "child_process";
const exec = util.promisify(execFile);

export async function publishToMarketplace(vsixPath: string, manifestPath: string, personalAccessToken: string): Promise<boolean> {
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
  try {
    await exec(
      "VsixPublisher.exe",
      ["publish", "-payload", vsixPath, "-publishManifest", manifestPath, "-personalAccessToken", personalAccessToken],
      options
    );
  } catch (err) {
    setFailed(err);
  }

  info("Successfully published package to marketplace !");

  return true;
}

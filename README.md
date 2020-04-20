# vs-marketplace-publisher
Publish your Visual Studio extension to the marketplace

## Usage

You can use the VS Marketplace Publisher GitHub Action in a [GitHub Actions Workflow](https://help.github.com/en/articles/about-github-actions) by configuring a YAML-based workflow file, e.g. `.github/workflows/publish.yml`, in two differents ways:
- Triggered when a release containing a vsix package is created
- Use an already generated vsix package from a previous action step

**This action only works on windows runner**

### From a release
```yaml
name: Publish to VS Marketplace

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: windows-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
        
      - name: Publish release to marketplace
        id: publish
        uses: mrluje/vs-marketplace-publisher@v2
        with:
          # (Required) Personal access token to perform action on the VS Marketplace
          pat: ${{ secrets.vs_pat }}
          
          # (Required) Path to the manifest used for the publish (e.g.: https://docs.microsoft.com/fr-fr/visualstudio/extensibility/walkthrough-publishing-a-visual-studio-extension-via-command-line?view=vs-2019#publishmanifest-file)
          manifestPath: vs-extension/vsixManifest.json
          
          # (Optional) Fetch the latest release container a vsix package for upload to the VS Marketplace
          useLatestReleaseAsset: true
```          
       
### From a locally generated package
```yaml
name: Publish to VS Marketplace

env:
  config: Release
  solution: vs-extension.sln
  vsixContainer: ${{ github.workspace }}\vs-extension.vsix

on:
  push:
    branches:
      - master

jobs:
  publish:
    runs-on: windows-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      
      - name: Add MSBuild to PATH
        uses: microsoft/setup-msbuild@v1.0.0      
      - uses: nuget/setup-nuget@v1
        with:
          nuget-version: '5.x'

      - name: Add VSTest to PATH
        uses: darenm/Setup-VSTest@v1

      - name: NuGet restore ${{ env.solution }}
        run: nuget restore ${{ env.solution }}

      - name: MSBuild ${{ env.solution }}
        run: |
          msbuild ${{ env.solution }} /p:Configuration=${{ env.config }} /p:TargetVsixContainer=${{ env.vsixContainer }} /p:DeployExtension=False /verbosity:minimal
        
      - name: Publish release to marketplace
        id: publish
        uses: mrluje/vs-marketplace-publisher@v2
        with:
          # (Required) Personal access token to perform action on the VS Marketplace
          pat: ${{ secrets.vs_pat }}
          
          # (Required) Path to the manifest used for the publish (e.g.: https://docs.microsoft.com/fr-fr/visualstudio/extensibility/walkthrough-publishing-a-visual-studio-extension-via-command-line?view=vs-2019#publishmanifest-file)
          manifestPath: vs-extension/vsixManifest.json
          
          # (Optional) Fetch the latest release container a vsix package for upload to the VS Marketplace
          vsixPath: ${{ env.vsixContainer }}
          
       

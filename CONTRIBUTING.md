## Developer Information

### Remote Debugging

For some tasks, it's important to be able to emulate [remote execution](https://code.visualstudio.com/docs/remote/remote-overview) of the VS Code - e.g. to reproduce or debug the behavior users observe when working in browser-based tools like Github Codespaces, or Salesforce Code Builder.

VSCode provides some very helpful [documentation](https://code.visualstudio.com/api/advanced-topics/remote-extensions#debugging-extensions) on how to test and debug extensions for that environment. In short, one would need to set up Dev Containers execution as described [here](https://code.visualstudio.com/api/advanced-topics/remote-extensions#debugging-in-a-custom-development-container).

To run `atlascode` in such a way, please follow the VSCode documentation:

-   Install [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) VSCode Extension
-   Run `npm install` like you normally would
-   In VSCode, choose `Dev Containers: Rebuild and Reopen in Container` from the command pallette
-   Wait for the VSCode to re-open in the container evnironment - you'll be able to see the difference in the header/search bar
-   Proceed to run or debug the extension as usual - it will now be running as it would in remote execution

The configuration for the Dev Container is located in [./.devcontainer/devcontainer.json](https://bitbucket.org/atlassianlabs/atlascode/src/main/.devcontainer/devcontainer.json).

Note: for advanced use-cases, it is possible to run scripts in dev containers via [@devcontainers/cli](https://github.com/devcontainers/cli) - try `npx devcontainer --help`

### Feature Flags

This package uses FX3 - Atlassian's internal solution for running experiments and rolling out features. Using it requires an API key, which is not included in code as a matter of policy.

If you are an Atlassian dev reading this - please look up the `atlascode` section [here](https://developer.atlassian.com/platform/frontend-feature-flags/resources/api-keys/), copy the value for the appropriate environment into `.env`, and rebuild the project.

If you are an external contributor - please feel free to ignore the feature gate client initialization failure, the default configuration of the extension will work without it, as if all feature gated content were disabled.

# Atlascode 0.2.0
### Atlassian integrations for VSCode
Atlascode brings the functionality of multiple Atlassian products to your favorite IDE!

## What's New In 0.2.0
### Bug
* [VSCODE-179](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-179) - Make JQL edit dialog less frustrating

### Task
* [VSCODE-122](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-122) - Quick pick dropdown for selecting Jira project does not show all available projects in a site
* [VSCODE-135](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-135) - add webview for creating PRs
* [VSCODE-136](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-136) - update create PR context menu to show new webview
* [VSCODE-138](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-138) - add custom JQL to jira explorer
* [VSCODE-142](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-142) - add ability to configure jira auto-refresh time
* [VSCODE-143](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-143) - add ability to configure BB auto-refresh time
* [VSCODE-145](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-145) - add info message popup when new PRs are detected
* [VSCODE-153](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-153) - show related issues for epics on issue view screen
* [VSCODE-165](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-165) - Use the VS Code clipboard API instead of the library we're using for copy link to PR.
* [VSCODE-168](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-168) - update 0.1.1 release notes
* [VSCODE-169](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-169) - Allow multiple JQL queries
* [VSCODE-170](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-170) - Update SiteJql representation to handle names and enabled/disabled
* [VSCODE-174](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-174) - Show related Jira issues in pull request webview
* [VSCODE-177](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-177) - Allow reordering of custom JQL queries
* [VSCODE-178](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-178) - Update Jira explorer when custom JQL is updated
* [VSCODE-182](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-182) - Validate source branch by comparing local changes to remote
* [VSCODE-183](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-183) - Option to push local changes before submitting pull request
* [VSCODE-185](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-185) - Fix styles on pull request creation webview
* [VSCODE-186](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-186) - Link to PR tree view after creating pull request


## What's New In 0.1.1
### Bug
* [VSCODE-108](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-108) - Webviews don't work properly in split view.

### Task
* [VSCODE-48](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-48) - Handle pagination in all Bitbucket apis
* [VSCODE-131](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-131) - issues in BB explorer
* [VSCODE-141](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-141) - map BB staging clone urls to BB client base url
* [VSCODE-161](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-161) - Use diffstat instead of patch to get files changed in a PR
* [VSCODE-163](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-163) - Integrate JQL autocomplete input
* [VSCODE-164](https://pi-dev-sandbox.atlassian.net/browse/VSCODE-164) - Persist custom JQL for each site

## Installation
Currently Atlascode uses some features from VSCode's "Proposed API" and cannot be installed directly into VSCode without a bit of tweaking.
This will be fixed before GTM, but for now you have two options:

### Option 1 (recommended) - whitelist Atlascode
This option requires tweaking vscode's product.json file to whitelist the atlascode extension to use the proposed API within the stable release of VSCode.

You only need to do this once and Atlascode will work from then on. Here's how:

**LINUX**:
the product.json can be found here: `/usr/share/code/resources/app/product.json`.

**MAC**:
the product.json can be found by going to the Applications folder, finding VSCode, right click, and choose "Open Contents".

From there, the file can be found in `Resources/app/product.json`

Edit the file and look for the entry array `"extensionAllowedProposedApi"`

Add this entry to the bottom of the array: `"atlassianlabs.atlascode"`

The full thing should look something like:
```
"extensionAllowedProposedApi": [
    "ms-vscode.references-view",
    "ms-vsliveshare.vsliveshare",
    "atlassianlabs.atlascode"
],
```

Save the file and restart VSCode. You're now ready to install.

### Option 2 (NOT recommended) - use VSCode Insiders
You can install Atlascode within [VSCode Insiders](https://code.visualstudio.com/insiders) without any modifications. **However**, the Insiders builds are extremely volitale and buggy so we don't reccomend this.

OK, finally, to actually install the thing, open the Extensions drawer in VSCode and use the "meatball" menu in the top right corner to select "Install from VSIX".  Then find the atlascode vsix and install it.

## Features

`Issue Explorer`: shows a treeview of Jira Issues which open the issue view when clicked

`Issue View`: shows the details of an issue and allows you to submit new comments and transition the issue

`Issue Hovers`: hover over something that looks like an issue key in your source code to get the details

`Pull Request Explorer`: shows a treeview of PRs for the Bitbucket cloud repos in the workspace which will open detail views when clicked

`PR Details View`: allows you to see the PR summary, checkout the PR branch, add comments, and approve the PR

`PR Diff View`: click on any file in the PR Explorer to get a diff view of the file as well as read and add comments

`Bitbucket Context Menus`: right-click to get context menus that let you quickly navigate to specific code in Bitbucket or copy the url to the clipboard

`Configuration`: a custom config screen is provider to authenticate with the Atlassian products as well as customize almost everything about the extension. You can get to it by looking for `Atlascode: Open Settings` in the command palette.


## Be Kind

This is a preview release. Some features may not work properly...

Please use the in-app feedback form to send us feedback.

If you're really stuck, you can ping us in the [Atlascode Help Stride room](https://applink.atlassian.com/stride/a436116f-02ce-4520-8fbb-7301462a1674/chat/20317f63-2ed0-40d2-86b2-7611fa9b0035).



## What's New In 1.2.3
### Bugs fixed
* JQL error when opening related Jira issues in the pull request tree
  
## What's New In 1.2.2
### Improvements
* Extension works with [Bitbucket's upcoming API changes](https://developer.atlassian.com/cloud/bitbucket/bitbucket-api-changes-gdpr/) related to user privacy
* Context menu item in treeviews to open in browser
* Support to add an issue link when creating a Jira issue

## What's New In 1.2.1
### Improvements
* Added Jira issue links to Issue Details view
* The configured development branch is now the default source when starting work on an issue
* Added more default issue code link triggers
* (experimental) bitbucket-pipelines.yml editing support
* Added external [user guide](https://confluence.atlassian.com/display/BITBUCKET/Atlassian+For+VSCode)

### Bugs fixed
* Mention names in pull request comments are not shown properly
* Transition menu on start work page not working
* PR create screen is not splitting the title and description correctly
  
## What's New In 1.2.0
### Improvements
* Start work from Bitbucket issue webview
* Show additional information in Jira issue view (reporter, Bitbucket pull request status)
* Add issue titles to Jira notifications
* Option to close source branch after merge when creating pull request
* Made pipelines header consistent with other webviews
* Use new VS Code API for comments in pull requests

### Bugs fixed
* Long code blocks in Jira issues break out of their column
* Markdown doesn't render in comments on Jira issues
* Hovering on issue key to get details not working
* Pipeline summary fails for in-progress builds

## What's New In 1.1.0
### Improvements
* Code hint to create issue from comment triggers
* Add right-click create Jira issue in code view
* Open Jira issue by key from command palette
* Explorer for Bitbucket issues
* Webview to create, view and update Bitbucket issues
* Notifications for new Bitbucket issues
* Show related Bitbucket issues in pull requests
* Show recent Bitbucket pull requests for Jira issues
* Improve issue created message when multiple issues are created one after another
* Allow user to view logs from pipeline builds
* Separate pipelines results by repo
* Improve subtask display in treeviews to respect jql filter
* Improvement and consistency for error messages in webviews

### Bugs fixed
* Welcome page opens on every new window
* Pull request comments are being duplicated when treeview is refreshed
* Fix auth timeout tab opening randomly sometimes
* Handle cases when default site is not selected in settings screen
* Filter out done issues in 'Your Issues' treeview
* Fix pipelines result display with manual deployments
* Jira issue details were not loading completely in some cases

## What's New In 1.0.4
### Bug
* Fixed a bug where upstream branch was not being set properly when starting work on Jira issue

## What's New In 1.0.3
### Bug
* Fixed another case causing extension to open an authentication browser tab occasionally without user interaction

## What's New In 1.0.2
### Bug
* Extension opens an authentication browser tab occasionally without user interaction
* Handle treeviews gracefully when there are no Bitbucket repos
* Jira issue view shows blank page for some issues
* Status bar settings are reset on restart
* Checkboxes did not reflect correct state in settings page

### Improvements
* Render markup for description for Jira issues
* Group sub-tasks by parent issue in tree view
* Show parent issue link for sub-tasks in jira details view
* Improve styling on start work success message
* Remove/disable start work button on issue screen if you're already on the issue branch
* Moved site selector in settings to authorization section
* Add site selector to the custom jql config screen
* Support for default reviewers while creating pull requests
* Detect dirty working tree and ask user to commit when creating PRs

## What's New In 1.0.1
### Bug
* Extension occasionally opens up a browser window to auth until the user authenticates
* General authentication fixes
* Start work on issue hangs with non-Bitbucket repos
* Custom JQL tree not refreshing when refresh button clicked
* Length check causing View Issue page to dissappear
* Pipelines explorer not initializing properly
* Open in bitbucket context menu item not working on repository nodes
* Create Pull Request hangs with non-Bitbucket Cloud repos

### Improvements
* Add Project key to project selector list to dedupe project names
* Add refresh button to custom JQL tree
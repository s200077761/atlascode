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
import { commands, Uri } from "vscode";
import { Issue } from "src/jira/jiraIssue";

export function viewInBrowser(issue: Issue) {
    const url = `https://${issue.workingSite.name}.${issue.workingSite.baseUrlSuffix}/browse/${issue.key}`;
    commands.executeCommand('vscode.open', Uri.parse(url));
}

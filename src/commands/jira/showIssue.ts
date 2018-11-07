import { IssuePanel } from "../../views/jira/issuePanel";
import { JiraIssue } from "../../jira/jiraIssue";
import { Logger } from "../../logger";
import { fetchIssue } from "../../jira/fetchIssue";

export async function showIssue(extensionPath: string, issue: JiraIssue) {
  IssuePanel.createOrShow(extensionPath, issue);
}

export async function showIssueByKey(extensionPath: string, issueKey: string) {
  fetchIssue(issueKey)
  .then((issue: JiraIssue) => {
    IssuePanel.createOrShow(extensionPath, issue);
  })
  .catch((reason: any) => {
    Logger.error(reason);
  });
}

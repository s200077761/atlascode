import { Issue, isIssue } from "../../jira/jiraIssue";
import { Container } from "../../container";
import { Logger } from "../../logger";
import { AuthProvider } from "../../atlclients/authInfo";
import { IssueNode } from "../../views/nodes/issueNode";

export async function assignIssue(param: Issue | IssueNode, accountId?: string) {
  const issue = isIssue(param) ? param : param.issue;
  let client = await Container.clientManager.jirarequest(issue.workingSite);
  if (!client) {
    return;
  }

  if (!accountId) {
    const authInfo = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud);
    accountId = authInfo ? authInfo.user.id : undefined;
  }

  const response = await client.issue
    .assignIssue({
      issueIdOrKey: issue.id,
      body: {
        accountId: accountId
      }
    });
  Logger.info(response);
  Container.jiraExplorer.refresh();
}

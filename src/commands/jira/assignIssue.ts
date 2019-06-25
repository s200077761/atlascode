import { Issue, isIssue } from "../../jira/jiraIssue";
import { Container } from "../../container";
import { Logger } from "../../logger";
import { IssueNode } from "../../views/nodes/issueNode";
import { currentUserJira } from "./currentUser";

export async function assignIssue(param: Issue | IssueNode, accountId?: string) {
  const issue = isIssue(param) ? param : param.issue;
  const client = await Container.clientManager.jirarequest(issue.siteDetails);

  if (!accountId) {
    const me = await currentUserJira(issue.siteDetails);
    accountId = me ? me.accountId : undefined;
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

export async function unassignIssue(issue: Issue) {
  const client = await Container.clientManager.jirarequest(issue.siteDetails);

  const response = await client.issue
    .assignIssue({
      issueIdOrKey: issue.id,
      body: {
        accountId: undefined
      }
    });
  Logger.info(response);
  Container.jiraExplorer.refresh();
}
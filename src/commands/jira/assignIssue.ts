import { Container } from "../../container";
import { Logger } from "../../logger";
import { IssueNode } from "../../views/nodes/issueNode";
import { currentUserJira } from "./currentUser";
import { MinimalIssue, isMinimalIssue } from "../../jira/jiraModel";

export async function assignIssue(param: MinimalIssue | IssueNode, accountId?: string) {
  const issue = isMinimalIssue(param) ? param : param.issue;
  const client = await Container.clientManager.jirarequest(issue.siteDetails);

  if (!accountId) {
    const me = await currentUserJira(issue.siteDetails);
    accountId = me ? me.accountId : undefined;
  }

  const response = await client.assignIssue(issue.id, accountId);
  Logger.info(response);
  Container.jiraExplorer.refresh();
}

export async function unassignIssue(issue: MinimalIssue) {
  const client = await Container.clientManager.jirarequest(issue.siteDetails);

  const response = await client.assignIssue(issue.id, undefined);
  Logger.info(response);
  Container.jiraExplorer.refresh();
}
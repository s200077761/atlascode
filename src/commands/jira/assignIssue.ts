import { Issue } from "../../jira/jiraIssue";
import { Container } from "../../container";
import { Logger } from "../../logger";

export async function assignIssue(issue: Issue, accountId?: string) {
  let client = await Container.clientManager.jirarequest(issue.workingSite);

  if (client) {
    const response = await client.issue
      .assignIssue({
        issueIdOrKey: issue.id,
        body: {
          accountId: accountId
        }
      });
      Logger.info(response);
  }
}

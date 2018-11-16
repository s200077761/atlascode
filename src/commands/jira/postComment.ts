import { Issue } from "../../jira/jiraIssue";
import { Container } from "../../container";
import { Logger } from "../../logger";

export async function postComment(issue: Issue, comment: string) {
  let client = await Container.clientManager.jirarequest();

  if (client) {
    client.issue
      .addComment({
        issueIdOrKey: issue.id,
        body: {
          body: comment
        }
      })
      .then((response: any)  => {
        Logger.info(response);
      });
  }
}

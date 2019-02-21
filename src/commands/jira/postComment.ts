import { Issue } from "../../jira/jiraIssue";
import { Container } from "../../container";
import { Logger } from "../../logger";
import { issueCommentEvent } from "../../analytics";

export async function postComment(issue: Issue, comment: string) {
  let client = await Container.clientManager.jirarequest(issue.workingSite);

  if (client) {
    client.issue
      .addComment({
        issueIdOrKey: issue.id,
        body: {
          body: comment
        }
      })
      .then((response: any) => {
        issueCommentEvent(Container.jiraSiteManager.effectiveSite.id).then(e => { Container.analyticsClient.sendTrackEvent(e); });
        Logger.info(response);
      });
  }
}

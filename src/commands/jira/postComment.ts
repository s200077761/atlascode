import { Issue } from "../../jira/jiraIssue";
import { Container } from "../../container";
import { issueCommentEvent } from "../../analytics";

export async function postComment(issue: Issue, comment: string) {
  let client = await Container.clientManager.jirarequest(issue.workingSite);

  if (client) {
    let resp = await client.issue.addComment({
      issueIdOrKey: issue.id,
      body: {
        body: comment
      }
    });

    issueCommentEvent(Container.jiraSiteManager.effectiveSite.id).then(e => { Container.analyticsClient.sendTrackEvent(e); });

    return resp;
  } else {
    throw new Error('error getting jira client');
  }
}

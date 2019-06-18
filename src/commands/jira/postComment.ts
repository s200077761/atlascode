import { Issue } from "../../jira/jiraIssue";
import { Container } from "../../container";
import { issueCommentEvent } from "../../analytics";

export async function postComment(issue: Issue, comment: string) {
  let client = await Container.clientManager.jirarequest(issue.siteDetails);

  let resp = await client.issue.addComment({
    issueIdOrKey: issue.id,
    body: {
      body: comment
    }
  });

  issueCommentEvent(issue.siteDetails.id).then(e => { Container.analyticsClient.sendTrackEvent(e); });

  return resp;
}

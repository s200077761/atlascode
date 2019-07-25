import { DetailedIssue } from "../../jira/jira-client/model/detailedJiraIssue";
import { Container } from "../../container";
import { issueCommentEvent } from "../../analytics";

export async function postComment(issue: DetailedIssue, comment: string) {
  let client = await Container.clientManager.jirarequest(issue.siteDetails);

  let resp = await client.addComment(issue.id, comment);

  issueCommentEvent(issue.siteDetails.id).then(e => { Container.analyticsClient.sendTrackEvent(e); });

  return resp;
}

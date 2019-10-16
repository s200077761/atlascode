import { Container } from "../../container";
import { issueCommentEvent } from "../../analytics";
import { IssueKeyAndSite, Comment } from "../../jira/jira-client/model/entities";

export async function postComment(issue: IssueKeyAndSite, comment: string, internal?: boolean): Promise<Comment> {
  let client = await Container.clientManager.jiraClient(issue.siteDetails);

  let resp = await client.addComment(issue.key, comment, internal);

  issueCommentEvent(issue.siteDetails).then(e => { Container.analyticsClient.sendTrackEvent(e); });

  return resp;
}

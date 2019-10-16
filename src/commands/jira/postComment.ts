import { Container } from "../../container";
import { issueCommentEvent } from "../../analytics";
import { IssueKeyAndSite, Comment, CommentVisibility } from "../../jira/jira-client/model/entities";

export async function postComment(issue: IssueKeyAndSite, comment: string, restriction?: CommentVisibility): Promise<Comment> {
  let client = await Container.clientManager.jiraClient(issue.siteDetails);

  let resp = await client.addComment(issue.key, comment, restriction);

  issueCommentEvent(issue.siteDetails).then(e => { Container.analyticsClient.sendTrackEvent(e); });

  return resp;
}

import { CommentVisibility, IssueKeyAndSite } from "jira-pi-client";
import { issueCommentEvent } from "../../analytics";
import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { Container } from "../../container";

export async function postComment(issue: IssueKeyAndSite<DetailedSiteInfo>, comment: string, restriction?: CommentVisibility): Promise<Comment> {
  let client = await Container.clientManager.jiraClient(issue.siteDetails);

  let resp = await client.addComment(issue.key, comment, restriction);

  issueCommentEvent(issue.siteDetails).then(e => { Container.analyticsClient.sendTrackEvent(e); });

  return resp;
}

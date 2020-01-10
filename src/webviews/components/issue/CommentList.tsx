import Avatar from "@atlaskit/avatar";
import Comment, { CommentAuthor, CommentTime } from "@atlaskit/comment";
import { Comment as JiraComment } from "@atlassianlabs/jira-pi-common-models/entities";
import { distanceInWordsToNow } from "date-fns";
import * as React from "react";

type Props = {
  comments: JiraComment[];
  isServiceDeskProject: boolean;
};

type State = { comments: JiraComment[] };

export class CommentList extends React.Component<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = { comments: props.comments };
  }

  componentWillReceiveProps(nextProps: any) {
    if (nextProps.comments !== undefined) {
      this.setState({ comments: nextProps.comments });
    }
  }

  commentList(): any[] {
    //const issue = this.props.issue;

    let result: any[] = [];
    this.state.comments.forEach((comment: JiraComment) => {
      const prettyCreated = `${distanceInWordsToNow(comment.created)} ago`;
      //const created = (isNaN(Date.parse(comment.created))) ? comment.created : new Date(comment.created).toLocaleString();
      const body = (comment.renderedBody) ? comment.renderedBody : comment.body;
      const type = this.props.isServiceDeskProject
        ? comment.jsdPublic
          ? 'external'
          : 'internal'
        : undefined;
      const commentMarkup =
        <Comment
          avatar={
            <Avatar
              src={comment.author.avatarUrls["48x48"]}
              label="Atlaskit avatar"
              size="medium"
            />
          }
          author={<CommentAuthor><div className="jira-comment-author">{comment.author.displayName}</div></CommentAuthor>}
          time={<CommentTime>{prettyCreated}</CommentTime>}
          type={type}
          content={<div className="jira-comment"><p dangerouslySetInnerHTML={{ __html: body }} /></div>}
        />;

      result.push(commentMarkup);
    });
    return result;
  }

  render() {
    return (
      <React.Fragment>
        {this.commentList()}
      </React.Fragment>
    );
  }
}

import * as React from "react";
import Avatar from "@atlaskit/avatar";
import Button, { ButtonGroup } from "@atlaskit/button";
import Comment, { CommentAuthor, CommentTime } from "@atlaskit/comment";
import Spinner from '@atlaskit/spinner';
import { Comment as JiraComment } from "../../../jira/jira-client/model/entities";

type Props = {
  loading: boolean;
  comments: JiraComment[];
  onAddComment: (comment: string) => void;
};

type State = { comments: JiraComment[], loading: boolean, commentInput: string };

export class Comments extends React.Component<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = { loading: props.loading, comments: props.comments, commentInput: "" };
  }

  handleSave = (e: any) => {
    this.props.onAddComment(this.state.commentInput);
    this.setState({ commentInput: "" });
  }

  handleCancel = (e: any) => {
    this.setState({ commentInput: "" });
  }

  handleChange = (e: any) => {
    this.setState({ commentInput: e.target.value });
  }

  componentWillReceiveProps(nextProps: any) {
    if (nextProps.loading !== undefined) {
      this.setState({ loading: nextProps.loading });
    }

    if (nextProps.comments !== undefined) {
      this.setState({ comments: nextProps.comments });
    }
  }

  commentList(): any[] {
    //const issue = this.props.issue;

    let result: any[] = [];
    this.state.comments.forEach((comment: JiraComment) => {
      const created = (isNaN(Date.parse(comment.created))) ? comment.created : new Date(comment.created).toLocaleString();
      const commentMarkup = (
        <Comment
          avatar={
            <Avatar
              src={comment.author.avatarUrls["48x48"]}
              label="Atlaskit avatar"
              size="medium"
            />
          }
          author={<CommentAuthor><div className="jira-comment-author">{comment.author.displayName}</div></CommentAuthor>}
          time={<CommentTime>{created}</CommentTime>}
          content={<div className="jira-comment"><p dangerouslySetInnerHTML={{ __html: comment.body }} /></div>}
        />
      );
      result.push(commentMarkup);
    });
    return result;
  }

  commentForm(): any {
    return (
      <div style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}>
        {this.state.loading && <Spinner size='large' />}
        <textarea
          className='ac-textarea'
          rows={3}
          placeholder='Add a comment'
          value={this.state.commentInput}
          onChange={this.handleChange}
        />
        <ButtonGroup>
          <Button className='ac-button' onClick={this.handleSave} isDisabled={!this.state.commentInput.trim()}>Save</Button>
          <Button appearance="default" onClick={this.handleCancel}>Cancel</Button>
        </ButtonGroup>
      </div>
    );
  }

  render() {
    return (
      <React.Fragment>
        {this.commentList()}
        {this.commentForm()}
      </React.Fragment>
    );
  }
}

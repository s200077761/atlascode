import * as React from "react";
import Avatar from "@atlaskit/avatar";
import Button, { ButtonGroup } from "@atlaskit/button";
import Comment, { CommentAuthor } from "@atlaskit/comment";
import { Comment as JiraComment, Issue } from "../../../jira/jiraModel";

export class Comments extends React.Component<
  {
    issue: Issue;
    onSave: (issue: Issue, comment: string) => void;
  },
  { commentInput: string }
  > {
  constructor(props: any) {
    super(props);
    this.state = { commentInput: "" };
  }

  handleSave = (e: any) => {
    this.props.onSave(this.props.issue, this.state.commentInput);
    this.setState({ commentInput: "" });
  }

  handleCancel = (e: any) => {
    this.setState({ commentInput: "" });
  }

  handleChange = (e: any) => {
    this.setState({ commentInput: e.target.value });
  }

  comments(): any[] {
    const issue = this.props.issue;

    let result: any[] = [];
    issue.comments.forEach((comment: JiraComment) => {
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
        {this.comments()}
        {this.commentForm()}
      </React.Fragment>
    );
  }
}

import * as React from "react";
import Avatar from "@atlaskit/avatar";
import Button, { ButtonGroup } from "@atlaskit/button";
import Comment, { CommentAuthor } from "@atlaskit/comment";
import { FieldTextAreaStateless } from "@atlaskit/field-text-area";
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
          author={<CommentAuthor>{comment.author.displayName}</CommentAuthor>}
          content={comment.body}
        />
      );
      result.push(commentMarkup);
    });
    return result;
  }

  commentForm(): any {
    return (
      <div
        style={{
          marginRight: 8,
          marginLeft: 8,
          marginTop: 10,
          marginBottom: 10
        }}
      >
        <FieldTextAreaStateless
          className="ak-textarea"
          placeholder="Add a comment"
          isLabelHidden
          enableResize
          shouldFitContainer
          minimumRows={3}
          onChange={this.handleChange}
          value={this.state.commentInput}
        />
        <div style={{ marginTop: 5 }}>
          <ButtonGroup>
            <Button
              className="ak-button"
              onClick={this.handleSave}
              isDisabled={!this.state.commentInput.trim()}
            >
              Save
            </Button>
            <Button appearance="default" onClick={this.handleCancel}>
              Cancel
            </Button>
          </ButtonGroup>
        </div>
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

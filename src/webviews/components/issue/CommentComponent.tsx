import Avatar from '@atlaskit/avatar';
import { ButtonGroup } from '@atlaskit/button';
import { Button } from '@atlaskit/button/dist/cjs/components/Button';
import Comment, { CommentAction, CommentAuthor, CommentEdited, CommentTime } from '@atlaskit/comment';
import {
    Comment as JiraComment,
    CommentVisibility,
    JsdInternalCommentVisibility
} from '@atlassianlabs/jira-pi-common-models/entities';
import { distanceInWordsToNow } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import PopoutMentionPicker from '../pullrequest/PopoutMentionPicker';

interface Props {
    siteDetails: DetailedSiteInfo;
    comment: JiraComment;
    isServiceDeskProject: boolean;
    fetchUsers: (input: string) => Promise<any[]>;
    onSave: (commentBody: string, commentId?: string, restriction?: CommentVisibility) => void;
    onDelete: (commentId: string) => void;
}

export const CommentComponent: React.FC<Props> = ({
    siteDetails,
    comment,
    isServiceDeskProject,
    fetchUsers,
    onSave
}: Props) => {
    const [commentInputRef, setCommentInputRef] = useState(null! as HTMLTextAreaElement);
    const [editing, setEditing] = useState(false);
    const [commentInputValue, setCommentInputValue] = useState(comment.body);
    const [cursorPosition, setCursor] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (commentInputRef) {
            commentInputRef.selectionStart = commentInputRef.selectionEnd = cursorPosition;
            commentInputRef.focus();
        }
    }, [commentInputRef, cursorPosition]);

    const handleCommentMention = (e: any) => {
        const { selectionStart, selectionEnd, value } = commentInputRef;
        const mentionText: string = e.mention;
        const commentInputWithMention = `${value.slice(0, selectionStart)}${mentionText} ${value.slice(selectionEnd)}`;
        setCursor(selectionStart + mentionText.length);
        setCommentInputValue(commentInputWithMention);
    };

    const prettyCreated = `${distanceInWordsToNow(comment.created)} ago`;
    const body = comment.renderedBody ? comment.renderedBody : comment.body;
    const type = isServiceDeskProject ? (comment.jsdPublic ? 'external' : 'internal') : undefined;

    if (editing) {
        return (
            <React.Fragment>
                <Comment
                    avatar={<Avatar src={comment.author.avatarUrls['48x48']} label="Atlaskit avatar" size="medium" />}
                    author={
                        <CommentAuthor>
                            <div className="jira-comment-author">{comment.author.displayName}</div>
                        </CommentAuthor>
                    }
                    content={
                        <React.Fragment>
                            <textarea
                                className="ac-textarea"
                                rows={5}
                                placeholder="Add a comment"
                                value={commentInputValue}
                                onChange={e => setCommentInputValue(e.target.value)}
                                ref={element => setCommentInputRef(element!)}
                                disabled={isSaving}
                            />
                            <div className="ac-textarea-toolbar">
                                <PopoutMentionPicker
                                    targetButtonContent="@"
                                    targetButtonTooltip="Mention @"
                                    loadUserOptions={async (input: string) =>
                                        (await fetchUsers(input)).map(user => ({
                                            displayName: user.displayName,
                                            avatarUrl: user.avatarUrls?.['48x48'],
                                            mention: siteDetails.isCloud
                                                ? `[~accountid:${user.accountId}]`
                                                : `[~${user.name}]`
                                        }))
                                    }
                                    onUserMentioned={handleCommentMention}
                                />
                            </div>
                        </React.Fragment>
                    }
                />
                <ButtonGroup>
                    <Button
                        className="ac-button"
                        onClick={() => {
                            onSave(commentInputValue, comment.id, undefined);
                            setIsSaving(true);
                        }}
                        isDisabled={isSaving}
                    >
                        {isServiceDeskProject ? 'Reply to customer' : 'Save'}
                    </Button>
                    {isServiceDeskProject && (
                        <Button
                            className="ac-button"
                            onClick={() => {
                                onSave(commentInputValue, comment.id, JsdInternalCommentVisibility);
                                setIsSaving(true);
                            }}
                            isDisabled={isSaving}
                        >
                            Add internal note
                        </Button>
                    )}
                    <Button appearance="default" onClick={() => setEditing(false)}>
                        Cancel
                    </Button>
                </ButtonGroup>
            </React.Fragment>
        );
    }

    return (
        <Comment
            avatar={<Avatar src={comment.author.avatarUrls['48x48']} label="Atlaskit avatar" size="medium" />}
            author={
                <CommentAuthor>
                    <div className="jira-comment-author">{comment.author.displayName}</div>
                </CommentAuthor>
            }
            time={<CommentTime>{prettyCreated}</CommentTime>}
            edited={comment.created !== comment.updated ? <CommentEdited>Edited</CommentEdited> : null}
            type={type}
            content={
                <div className="jira-comment">
                    <p dangerouslySetInnerHTML={{ __html: body }} />
                </div>
            }
            isSaving={isSaving}
            actions={
                siteDetails.userId === comment.author.accountId
                    ? [
                          <CommentAction onClick={() => setEditing(true)}>Edit</CommentAction>,
                          <CommentAction
                              onClick={() => {
                                  setIsSaving(true);
                              }}
                          >
                              Delete
                          </CommentAction>
                      ]
                    : []
            }
        />
    );
};

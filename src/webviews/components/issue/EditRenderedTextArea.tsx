import { ButtonGroup } from '@atlaskit/button';
import { Button } from '@atlaskit/button/dist/cjs/components/Button';
import Comment from '@atlaskit/comment';
import React, { useEffect, useState } from 'react';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import PopoutMentionPicker from '../pullrequest/PopoutMentionPicker';

interface Props {
    siteDetails: DetailedSiteInfo;
    text: string;
    renderedText?: string;
    isSaving: boolean;
    fetchUsers: (input: string) => Promise<any[]>;
    onSave: (text: string) => void;
}

export const EditRenderedTextArea: React.FC<Props> = ({
    siteDetails,
    text,
    renderedText,
    fetchUsers,
    isSaving,
    onSave
}: Props) => {
    const [textAreaRef, setCommentInputRef] = useState(null! as HTMLTextAreaElement);
    const [editing, setEditing] = useState(false);
    const [commentInputValue, setCommentInputValue] = useState(text);
    const [cursorPosition, setCursor] = useState(0);

    useEffect(() => {
        if (textAreaRef) {
            textAreaRef.selectionStart = textAreaRef.selectionEnd = cursorPosition;
            textAreaRef.focus();
        }
    }, [textAreaRef, cursorPosition]);

    const handleCommentMention = (e: any) => {
        const { selectionStart, selectionEnd, value } = textAreaRef;
        const mentionText: string = e.mention;
        const commentInputWithMention = `${value.slice(0, selectionStart)}${mentionText} ${value.slice(selectionEnd)}`;
        setCursor(selectionStart + mentionText.length);
        setCommentInputValue(commentInputWithMention);
    };

    if (editing) {
        return (
            <React.Fragment>
                <Comment
                    isSaving={isSaving}
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
                            onSave(commentInputValue);
                            setEditing(false);
                        }}
                        isDisabled={isSaving}
                    >
                        Save
                    </Button>
                    <Button appearance="default" onClick={() => setEditing(false)}>
                        Cancel
                    </Button>
                </ButtonGroup>
            </React.Fragment>
        );
    }

    return isSaving ? (
        <Comment content={<p style={{ whiteSpace: 'pre-wrap', opacity: 0.5 }}>{commentInputValue}</p>} />
    ) : (
        <Comment
            content={
                <div className="ac-inline-input-view-p" onClick={() => setEditing(true)}>
                    {renderedText ? <p dangerouslySetInnerHTML={{ __html: renderedText }} /> : <p>{text}</p>}
                </div>
            }
        />
    );
};

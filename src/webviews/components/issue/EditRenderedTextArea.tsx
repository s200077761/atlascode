import { ButtonGroup } from '@atlaskit/button';
import { Button } from '@atlaskit/button/dist/cjs/components/Button';
import Comment from '@atlaskit/comment';
import React, { useState } from 'react';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { TextAreaEditor } from './TextAreaEditor';

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
    const [editing, setEditing] = useState(false);
    const [commentInputValue, setCommentInputValue] = useState(text);

    if (editing) {
        return (
            <React.Fragment>
                <Comment
                    isSaving={isSaving}
                    content={
                        <TextAreaEditor
                            value={commentInputValue}
                            fetchUsers={async (input: string) =>
                                (await fetchUsers(input)).map(user => ({
                                    displayName: user.displayName,
                                    avatarUrl: user.avatarUrls?.['48x48'],
                                    mention: siteDetails.isCloud ? `[~accountid:${user.accountId}]` : `[~${user.name}]`
                                }))
                            }
                            disabled={isSaving}
                            onChange={(input: string) => setCommentInputValue(input)}
                        />
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
                    <Button
                        appearance="default"
                        onClick={() => {
                            setEditing(false);
                            setCommentInputValue(text);
                        }}
                    >
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

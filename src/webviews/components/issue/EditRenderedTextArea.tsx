import { ButtonGroup } from '@atlaskit/button';
import { Button } from '@atlaskit/button/dist/cjs/components/Button';
import Comment from '@atlaskit/comment';
import React, { useState } from 'react';
import { TextAreaEditor } from './TextAreaEditor';

interface Props {
    text: string;
    renderedText?: string;
    fetchUsers: (input: string) => Promise<any[]>;
    onSave: (text: string) => Promise<void>;
}

export const EditRenderedTextArea: React.FC<Props> = ({ text, renderedText, fetchUsers, onSave }: Props) => {
    const [editing, setEditing] = useState(false);
    const [commentInputValue, setCommentInputValue] = useState(text);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            setEditing(false);
            await onSave(commentInputValue);
        } finally {
            setIsSaving(false);
        }
    };

    if (editing) {
        return (
            <React.Fragment>
                <Comment
                    isSaving={isSaving}
                    content={
                        <TextAreaEditor
                            value={commentInputValue}
                            fetchUsers={fetchUsers}
                            disabled={isSaving}
                            onChange={(input: string) => setCommentInputValue(input)}
                        />
                    }
                />
                <ButtonGroup>
                    <Button className="ac-button" onClick={handleSave} isDisabled={isSaving}>
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

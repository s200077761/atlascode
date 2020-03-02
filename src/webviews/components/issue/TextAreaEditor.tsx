import React, { useEffect, useRef, useState } from 'react';
import PopoutMentionPicker from '../pullrequest/PopoutMentionPicker';

interface Props {
    value: string;
    disabled: boolean;
    placeholder?: string;
    fetchUsers: (input: string) => Promise<{ displayName: string; mention: string; avatarUrl?: string }[]>;
    onChange: (input: string) => void;
}

export const TextAreaEditor: React.FC<Props> = ({ value, disabled, placeholder, fetchUsers, onChange }: Props) => {
    const inputTextAreaRef = useRef<HTMLTextAreaElement>(null);
    const [cursorPosition, setCursorPosition] = useState(value.length);

    useEffect(() => {
        if (inputTextAreaRef.current) {
            inputTextAreaRef.current.selectionStart = inputTextAreaRef.current.selectionEnd = cursorPosition;
            inputTextAreaRef.current.focus();
        }
    }, [inputTextAreaRef, cursorPosition]);

    const handleCommentMention = (e: any) => {
        if (!inputTextAreaRef.current) {
            return;
        }
        const { selectionStart, selectionEnd, value } = inputTextAreaRef.current;
        const mentionText: string = e.mention;
        const commentInputWithMention = `${value.slice(0, selectionStart)}${mentionText} ${value.slice(selectionEnd)}`;
        setCursorPosition(selectionStart + mentionText.length);
        onChange(commentInputWithMention);
    };

    return (
        <React.Fragment>
            <textarea
                className="ac-textarea"
                rows={5}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                ref={inputTextAreaRef}
                disabled={disabled}
            />
            <div className="ac-textarea-toolbar">
                <PopoutMentionPicker
                    targetButtonContent="@"
                    targetButtonTooltip="Mention @"
                    loadUserOptions={fetchUsers}
                    onUserMentioned={handleCommentMention}
                />
            </div>
        </React.Fragment>
    );
};

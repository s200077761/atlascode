import React, { useEffect, useState } from 'react';
import PopoutMentionPicker from '../pullrequest/PopoutMentionPicker';

interface Props {
    text: string;
    disabled: boolean;
    placeholder?: string;
    fetchUsers: (input: string) => Promise<{ displayName: string; mention: string; avatarUrl?: string }[]>;
    onChange: (input: string) => void;
}

export const TextAreaEditor: React.FC<Props> = ({ text, disabled, placeholder, fetchUsers, onChange }: Props) => {
    const [inputTextAreaRef, setInputTextAreaRef] = useState(null! as HTMLTextAreaElement);
    const [inputValue, setInputValue] = useState(text);
    const [cursorPosition, setCursorPosition] = useState(text.length);

    useEffect(() => {
        if (inputTextAreaRef) {
            inputTextAreaRef.selectionStart = inputTextAreaRef.selectionEnd = cursorPosition;
            inputTextAreaRef.focus();
        }
    }, [inputTextAreaRef, cursorPosition]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => onChange(inputValue), [inputValue]);
    useEffect(() => {
        if (inputValue !== text) {
            setInputValue(text);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text]);

    const handleCommentMention = (e: any) => {
        const { selectionStart, selectionEnd, value } = inputTextAreaRef;
        const mentionText: string = e.mention;
        const commentInputWithMention = `${value.slice(0, selectionStart)}${mentionText} ${value.slice(selectionEnd)}`;
        setCursorPosition(selectionStart + mentionText.length);
        setInputValue(commentInputWithMention);
    };

    return (
        <React.Fragment>
            <textarea
                className="ac-textarea"
                rows={5}
                placeholder={placeholder}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                ref={element => setInputTextAreaRef(element!)}
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

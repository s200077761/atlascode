import * as React from 'react';
import Avatar from '@atlaskit/avatar';
import Button, { ButtonGroup } from '@atlaskit/button';
import Spinner from '@atlaskit/spinner';
import { User } from '../../../bitbucket/model';
import PopoutMentionPicker from './PopoutMentionPicker';

export default class CommentForm extends React.Component<{
    currentUser: User,
    visible: boolean,
    isAnyCommentLoading: boolean,
    onSave?: (content: string) => void,
    onCancel?: () => void,
    loadUserOptions?: any
}, { commentInput: string, isThisCommentLoading: boolean }> {

    private textAreaElement: HTMLTextAreaElement;

    constructor(props: any) {
        super(props);
        this.state = { commentInput: '', isThisCommentLoading: false };
    }

    componentWillReceiveProps(nextProps: any) {
        if (!nextProps.isAnyCommentLoading) {
            this.setState({ isThisCommentLoading: false });
        }
    }

    handleSave = (e: any) => {
        if (this.props.onSave) { this.props.onSave(this.state.commentInput); }
        this.setState({ commentInput: '', isThisCommentLoading: true });
    }

    handleCancel = (e: any) => {
        if (this.props.onCancel) { this.props.onCancel(); }
        this.setState({ commentInput: '' });
    }

    handleChange = (e: any) => {
        this.setState({ commentInput: e.target.value });
    }

    handleUserMentioned = (item: any) => {
        const { selectionStart, selectionEnd, value } = this.textAreaElement;
        const mentionText: string = item.mention;
        const updatedSummary = `${value.slice(0, selectionStart)}${mentionText} ${value.slice(selectionEnd)}`;
        this.setState({ commentInput: updatedSummary }, () => {
            this.textAreaElement.selectionStart = this.textAreaElement.selectionEnd = selectionStart + mentionText.length;
            this.textAreaElement.focus();
        });
    }

    render() {
        return <React.Fragment>
            {this.props.isAnyCommentLoading && this.state.isThisCommentLoading && <Spinner size='large' />}

            {this.props.visible &&
                <div className='ac-comment-form'>
                    <Avatar
                        appearance="circle"
                        name={this.props.currentUser.displayName}
                        src={this.props.currentUser.url}
                        size="medium"
                    />
                    <div style={{ width: '100%', marginLeft: 8 }}>
                        <textarea
                            className='ac-textarea'
                            rows={3}
                            placeholder='Add a comment'
                            value={this.state.commentInput}
                            onChange={this.handleChange}
                            ref={element => this.textAreaElement = element!}
                        />
                        {this.props.loadUserOptions &&
                            <div className='ac-textarea-toolbar'>
                                <PopoutMentionPicker loadUserOptions={this.props.loadUserOptions} onUserMentioned={this.handleUserMentioned} />
                            </div>
                        }
                        <ButtonGroup>
                            <Button className='ac-button' onClick={this.handleSave} isDisabled={!this.state.commentInput.trim()}>Save</Button>
                            <Button appearance="default" onClick={this.handleCancel}>Cancel</Button>
                        </ButtonGroup>
                    </div>
                </div>
            }
        </React.Fragment>;
    }
}
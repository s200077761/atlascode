import * as React from 'react';
import Avatar from '@atlaskit/avatar';
import Button, { ButtonGroup } from '@atlaskit/button';
import Spinner from '@atlaskit/spinner';
import { User } from '../../../bitbucket/model';

export default class CommentForm extends React.Component<{
    currentUser: User,
    visible: boolean,
    isAnyCommentLoading: boolean,
    onSave?: (content: string) => void,
    onCancel?: () => void
}, { commentInput: string, isThisCommentLoading: boolean }> {
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

    render() {
        return <React.Fragment>
            {this.props.isAnyCommentLoading && this.state.isThisCommentLoading && <Spinner size='large' />}

            {this.props.visible &&
                <div style={{ display: 'flex' }}>
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
                        />
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
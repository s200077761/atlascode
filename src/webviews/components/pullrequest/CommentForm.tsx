import * as React from 'react';
import Avatar from '@atlaskit/avatar';
import Button, { ButtonGroup } from '@atlaskit/button';
import { FieldTextAreaStateless } from '@atlaskit/field-text-area';

export default class CommentForm extends React.Component<{
    currentUser: Bitbucket.Schema.User,
    visible: boolean,
    onSave?: (content: string) => void,
    onCancel?: () => void
}, { commentInput: string }> {
    constructor(props: any) {
        super(props);
        this.state = { commentInput: '' };
    }

    handleSave = (e: any) => {
        if (this.props.onSave) { this.props.onSave(this.state.commentInput); }
        this.setState({ commentInput: '' });
    }

    handleCancel = (e: any) => {
        if (this.props.onCancel) { this.props.onCancel(); }
        this.setState({ commentInput: '' });
    }

    handleChange = (e: any) => {
        this.setState({ commentInput: e.target.value });
    }

    render() {
        return this.props.visible &&
            <React.Fragment>
                <div style={{ display: 'flex' }}>
                    <Avatar
                        appearance="circle"
                        name={this.props.currentUser.display_name}
                        src={this.props.currentUser.links!.avatar!.href}
                        size="medium"
                    />
                    <div style={{ width: 600, marginLeft: 8 }}>
                        <FieldTextAreaStateless
                            placeholder="Add a comment"
                            isLabelHidden enableResize shouldFitContainer minimumRows={3}
                            onChange={this.handleChange}
                            value={this.state.commentInput}
                        />
                        <ButtonGroup>
                            <Button appearance="primary" onClick={this.handleSave} isDisabled={!this.state.commentInput.trim()}>Save</Button>
                            <Button appearance="default" onClick={this.handleCancel}>Cancel</Button>
                        </ButtonGroup>
                    </div>
                </div>
            </React.Fragment>;
    }
}
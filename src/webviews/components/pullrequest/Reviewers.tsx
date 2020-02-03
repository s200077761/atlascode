import AvatarGroup from '@atlaskit/avatar-group';
import AddIcon from '@atlaskit/icon/glyph/add';
import Spinner from '@atlaskit/spinner';
import * as React from 'react';
import { PRData } from '../../../ipc/prMessaging';
import PopoutMentionPicker from './PopoutMentionPicker';

const avatarStatus = {
    APPROVED: 'approved',
    NEEDS_WORK: (
        <svg height="100%" version="1.1" viewBox="0 0 8 8" width="100%" xmlns="http://www.w3.org/2000/svg">
            <circle fill="rgb(255, 171, 0)" cx="4" cy="4" r="4"></circle>
            <path
                fill="rgb(255, 255, 255)"
                d="M3.3,1.9l2.8,2.8c0.2,0.2,0.2,0.5,0,0.7L5.4,6.1c-0.2,0.2-0.5,0.2-0.7,0L1.9,3.3c-0.2-0.2-0.2-0.5,0-0.7l0.7-0.7C2.8,1.7,3.1,1.7,3.3,1.9z"
            ></path>
        </svg>
    ),
    UNAPPROVED: undefined
};

interface Props extends PRData {
    isLoading: boolean;
    loadUserOptions: (input: string) => Promise<any[]>;
    onAddReviewer: (accountId: string) => void;
}

export default class Reviewers extends React.Component<Props, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        let reviewers;
        if (!this.props.pr!.data.participants || this.props.pr!.data.participants.length === 0) {
            reviewers = <p>No reviewers!</p>;
        } else {
            const participants = this.props
                .pr!.data.participants! // always show reviewers & show non-reviewers if they have approved or marked needs work
                .filter(p => p.status !== 'UNAPPROVED' || p.role === 'REVIEWER')
                .sort((a, b) => (a.status < b.status ? 0 : 1))
                .map(p => {
                    return {
                        name: p.displayName,
                        src: p.avatarUrl,
                        status: avatarStatus[p.status]
                    };
                });
            reviewers = <AvatarGroup appearance="stack" data={participants} maxCount={5} size="medium" />;
        }
        return (
            <React.Fragment>
                {reviewers}
                {this.props.isLoading && <Spinner size="small" />}
                <PopoutMentionPicker
                    targetButtonContent=""
                    targetButtonTooltip="Add reviewer"
                    targetButtonProps={{ iconBefore: <AddIcon label="add-reviewer" /> }}
                    loadUserOptions={this.props.loadUserOptions}
                    onUserMentioned={(user: any) => this.props.onAddReviewer(user.accountId)}
                />
            </React.Fragment>
        );
    }
}

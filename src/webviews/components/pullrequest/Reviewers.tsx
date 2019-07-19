import * as React from "react";
import { PRData } from '../../../ipc/prMessaging';
import AvatarGroup from '@atlaskit/avatar-group';

export default class Reviewers extends React.Component<PRData, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        if (!this.props.pr!.participants || this.props.pr!.participants.length === 0) { return <p>No reviewers!</p>; }
        const participants = this.props.pr!.participants!
            .filter(p => p.approved || p.role === 'REVIEWER')
            .sort((a, b) => a.approved ? 0 : 1)
            .map(p => {
                return {
                    name: p.displayName,
                    src: p.avatarUrl,
                    status: p.approved ? 'approved' : undefined
                };
            });
        return (
            <AvatarGroup
                appearance="stack"
                data={participants}
                maxCount={5}
                size="medium"
            />
        );
    }
}
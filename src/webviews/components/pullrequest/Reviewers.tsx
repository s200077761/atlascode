import * as React from "react";
import { PRData } from '../../../ipc/prMessaging';
import AvatarGroup from '@atlaskit/avatar-group';

export default class Reviewers extends React.Component<PRData, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        if (!this.props.pr!.participants) { return <p>No reviewers!</p>; }
        const participants = this.props.pr!.participants!
            .filter(p => p.role === 'REVIEWER')
            .map(p => {
                return {
                    name: p.displayName,
                    src: p.avatarUrl,
                    status: p.approved ? 'approved' : undefined
                };
            });
        return (
            <AvatarGroup
                appearance="grid"
                data={participants}
                maxCount={5}
                size="medium"
            />
        );
    }
}
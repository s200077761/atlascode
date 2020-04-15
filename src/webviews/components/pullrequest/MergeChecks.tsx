import * as React from 'react';
import { PRData } from '../../../ipc/prMessaging';

export default class MergeChecks extends React.Component<PRData, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        if (!this.props.pr) {
            return null;
        }
        const { taskCount, participants, buildStatuses } = this.props.pr.data;
        const openTaskCount = taskCount;
        const approvalCount = participants.filter((p) => p.status === 'APPROVED').length;
        const needsWorkCount = participants.filter((p) => p.status === 'NEEDS_WORK').length;
        let unsuccessfulBuilds = false;
        if (Array.isArray(buildStatuses) && buildStatuses.length > 0) {
            const successes = buildStatuses.filter((status) => status.state === 'SUCCESSFUL');
            unsuccessfulBuilds = buildStatuses.length !== successes.length;
        }
        const mergeChecks = (
            <React.Fragment>
                {openTaskCount > 0 && <p>️⚠️ Pull request has unresolved tasks</p>}
                {needsWorkCount > 0 && <p>️⚠️ Pull request has been marked as - Needs work</p>}
                {approvalCount === 0 ? (
                    <p>⚠️ Pull request has no approvals</p>
                ) : (
                    <p>
                        Pull request has {approvalCount} {approvalCount === 1 ? 'approval' : 'approvals'}
                    </p>
                )}
                {unsuccessfulBuilds && <p>️⚠️ Pull request has unsuccessful builds</p>}
            </React.Fragment>
        );

        return mergeChecks;
    }
}

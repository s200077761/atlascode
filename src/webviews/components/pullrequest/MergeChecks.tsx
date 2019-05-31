import * as React from 'react';
import { PRData } from '../../../ipc/prMessaging';

export default class MergeChecks extends React.Component<PRData, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        const openTaskCount = this.props.pr!.task_count || 0;
        const approvalCount = this.props.pr!.participants!.filter(p => p.approved && p.user!.account_id !== this.props.currentUser!.accountId).length;
        let unsuccessfulBuilds = false;
        if (Array.isArray(this.props.pr!.buildStatuses) && this.props.pr!.buildStatuses.length > 0) {
            const successes = this.props.pr!.buildStatuses.filter(status => status.state === 'SUCCESSFUL');
            unsuccessfulBuilds = this.props.pr!.buildStatuses.length !== successes.length;
        }
        const mergeChecks = <React.Fragment>
            {openTaskCount > 0 && <p>️⚠️ Pull request has unresolved tasks</p>}
            {approvalCount === 0 ? <p>⚠️ Pull request has no approvals</p> : <p>Pull request has {approvalCount} {approvalCount === 1 ? 'approval' : 'approvals'}</p>}
            {unsuccessfulBuilds && <p>️⚠️ Pull request has unsuccessful builds</p>}
        </React.Fragment>;

        return mergeChecks;
    }
}
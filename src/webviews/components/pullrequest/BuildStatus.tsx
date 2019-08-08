import * as React from 'react';
import CheckCircleIcon from '@atlaskit/icon/glyph/check-circle';
import RecentIcon from '@atlaskit/icon/glyph/recent';
import ErrorIcon from '@atlaskit/icon/glyph/error';
import InlineDialog from '@atlaskit/inline-dialog';
import Tooltip from '@atlaskit/tooltip';
import Button from '@atlaskit/button';
import { OpenBuildStatusAction } from '../../../ipc/prActions';
import { BuildStatus as BitbucketBuildStatus } from '../../../bitbucket/model';

const successIcon = <CheckCircleIcon primaryColor='green' label='build successful' />;
const inprogressIcon = <RecentIcon primaryColor='blue' label='build in progress' />;
const errorIcon = <ErrorIcon primaryColor='red' label='build failure' />;

export default class BuildStatus extends React.Component<{ buildStatuses?: BitbucketBuildStatus[], postMessage: (e: OpenBuildStatusAction) => void }, { dialogOpen: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { dialogOpen: false };
    }

    toggleDialog = () => this.setState({ dialogOpen: !this.state.dialogOpen });
    closeDialog = () => this.setState({ dialogOpen: false });

    render() {
        if (!this.props.buildStatuses || this.props.buildStatuses.length === 0) {
            return null;
        }
        const buildString = this.props.buildStatuses.length === 1 ? 'build' : 'builds';
        const successes = this.props.buildStatuses.filter(status => status.state === 'SUCCESSFUL');
        const inprogress = this.props.buildStatuses.filter(status => status.state === 'INPROGRESS');

        const resultIcon = inprogress.length > 0
            ? <Tooltip content={`${inprogress.length} of ${this.props.buildStatuses.length} ${buildString} in progress`} position='top'>{inprogressIcon}</Tooltip>
            : (successes.length === this.props.buildStatuses.length)
                ? <Tooltip content={`${successes.length} of ${this.props.buildStatuses.length} ${buildString} passed`} position='top'>{successIcon}</Tooltip>
                : <Tooltip content={`${this.props.buildStatuses.length - successes.length} of ${this.props.buildStatuses.length} ${buildString} unsuccessful`} position='top'>{errorIcon}</Tooltip>;

        return <div className='ac-inline-dialog'>
            <InlineDialog
                content={this.props.buildStatuses.map(status =>
                    <Button
                        appearance='link'
                        onClick={() => { this.props.postMessage({ action: 'openBuildStatus', buildStatusUri: status.url }); }}
                        iconBefore={status.state === 'INPROGRESS'
                            ? inprogressIcon
                            : status.state === 'SUCCESSFUL'
                                ? successIcon
                                : errorIcon}
                    >
                        {status.name}
                    </Button>)}
                isOpen={this.state.dialogOpen}
                onClose={this.closeDialog}>
                <Button appearance='link' iconBefore={resultIcon} onClick={this.toggleDialog} />
            </InlineDialog>
        </div>;
    }
}
import Lozenge from '@atlaskit/lozenge';
import Select, { components } from '@atlaskit/select';
import React from 'react';
import { BitbucketIssueData } from '../../../bitbucket/model';

export const StateRenderer = {
    new: <Lozenge appearance="new">new</Lozenge>,
    open: <Lozenge appearance="inprogress">open</Lozenge>,
    resolved: <Lozenge appearance="success">resolved</Lozenge>,
    'on hold': <Lozenge appearance="default">on hold</Lozenge>,
    invalid: <Lozenge appearance="moved">invalid</Lozenge>,
    duplicate: <Lozenge appearance="default">duplicate</Lozenge>,
    wontfix: <Lozenge appearance="removed">wontfix</Lozenge>,
    closed: <Lozenge appearance="default">closed</Lozenge>
};

const StatusOption = (props: any) => <components.Option {...props}>{StateRenderer[props.data]}</components.Option>;

const StatusValue = (props: any) => (
    <components.SingleValue {...props}>{StateRenderer[props.data.value]}</components.SingleValue>
);

export class StatusMenu extends React.Component<{
    issueData: BitbucketIssueData;
    isStatusButtonLoading: boolean;
    onHandleStatusChange: (item: any) => void;
}> {
    handleStatusChange = (item: any) => {
        this.props.onHandleStatusChange(item);
    };

    render() {
        const issueData = this.props.issueData;
        if (!issueData) {
            return <div />;
        }

        return (
            <Select
                name="status"
                id="status"
                className="ac-select-container"
                classNamePrefix="ac-select"
                options={['new', 'open', 'resolved', 'on hold', 'invalid', 'duplicate', 'wontfix', 'closed']}
                value={{ label: issueData.state, value: issueData.state }}
                components={{ Option: StatusOption, SingleValue: StatusValue }}
                isDisabled={this.props.isStatusButtonLoading}
                isLoading={this.props.isStatusButtonLoading}
                onChange={this.handleStatusChange}
            />
        );
    }
}

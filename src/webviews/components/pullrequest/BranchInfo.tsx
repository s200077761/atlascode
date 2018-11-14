import * as React from 'react';
import Arrow from '@atlaskit/icon/glyph/arrow-right';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import DropdownMenu, { DropdownItemGroup, DropdownItem } from '@atlaskit/dropdown-menu';
import Button from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import Tag from '@atlaskit/tag';
import { PRData } from '../../../ipc/prMessaging';
import { Checkout } from '../../../ipc/prActions';
import { Spacer } from './PullRequestPage';

export default class BranchInfo extends React.Component<{ prData: PRData, error?: string, postMessage: (e: Checkout) => void }, { loading: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { loading: false };
    }

    componentDidUpdate(prevProps: { prData: PRData, error?: string }) {
        if (prevProps.prData.currentBranch !== this.props.prData.currentBranch || prevProps.error !== this.props.error) {
            this.setState({ loading: false });
        }
    }

    handleCheckout = (branchName: string) => {
        this.setState({ loading: branchName !== this.props.prData.currentBranch });
        this.props.postMessage({
            action: 'checkout',
            branch: branchName
        });
    }

    render() {
        const pr = this.props.prData.pr!;
        return (
            <React.Fragment>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <DropdownMenu trigger={pr.source!.branch!.name} triggerType="button" triggerButtonProps={{ className: 'ak-button', spacing: 'compact', isLoading: this.state.loading }}>
                        <DropdownItemGroup>
                            <DropdownItem className='ak-dropdown-item' onClick={() => this.handleCheckout(pr.source!.branch!.name!)}>Checkout branch</DropdownItem>
                            <DropdownItem className='ak-dropdown-item' href={`${pr.source!.repository!.links!.html!.href}/src/${pr.source!.branch!.name}`}>Open branch on bitbucket.com</DropdownItem>
                        </DropdownItemGroup>
                    </DropdownMenu>
                    <Spacer>
                        <Arrow label="" size="small" />
                    </Spacer>
                    <DropdownMenu trigger={pr.destination!.branch!.name} triggerType="button" triggerButtonProps={{ className: 'ak-button', spacing: 'compact', isLoading: this.state.loading }}>
                        <DropdownItemGroup>
                            <DropdownItem className='ak-dropdown-item' onClick={() => this.handleCheckout(pr.destination!.branch!.name!)}>Checkout branch</DropdownItem>
                            <DropdownItem className='ak-dropdown-item' href={`${pr.destination!.repository!.links!.html!.href}/src/${pr.destination!.branch!.name}`}>Open branch on bitbucket.com</DropdownItem>
                        </DropdownItemGroup>
                    </DropdownMenu>
                </div>
                {this.props.prData.currentBranch === pr.source!.branch!.name && <Tag text="✔ Checked out" color="blueLight" />}
                {
                    this.props.error &&
                    <Tooltip content={this.props.error} type="warning">
                        <Button appearance="subtle-link" spacing="none" iconBefore={<WarningIcon label="" size="small" />}>Checkout error</Button>
                    </Tooltip>
                }
            </React.Fragment>
        );
    }
}
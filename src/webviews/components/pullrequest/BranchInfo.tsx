import * as React from 'react';
import Arrow from '@atlaskit/icon/glyph/arrow-right';
import BitbucketBranchesIcon from '@atlaskit/icon/glyph/bitbucket/branches';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import Avatar from '@atlaskit/avatar';
import DropdownMenu, { DropdownItemGroup, DropdownItem } from '@atlaskit/dropdown-menu';
import Button from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import Tag from '@atlaskit/tag';
import { PRData } from '../../../ipc/prMessaging';
import { Checkout } from '../../../ipc/prActions';
import { Spacer } from './PullRequestPage';
import styled from 'styled-components';

const FixedWidth = styled.div`
  max-width: 250px;
`;

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

    handleCheckout = (branchName: string, isSourceBranch: boolean) => {
        this.setState({ loading: branchName !== this.props.prData.currentBranch });
        this.props.postMessage({
            action: 'checkout',
            branch: branchName,
            isSourceBranch: isSourceBranch
        });
    }

    render() {
        const pr = this.props.prData.pr!;
        let sourcePrefix = '';
        let destinationPrefix = '';
        if (pr.source!.repository!.links!.html!.href! !== pr.destination!.repository!.links!.html!.href!) {
            sourcePrefix = pr.source!.repository!.full_name! + ':';
            destinationPrefix = pr.destination!.repository!.full_name! + ':';
        }
        const sourceHref = `${pr.source!.repository!.links!.html!.href}/src/${pr.source!.commit!.hash}/?at=${pr.source!.branch!.name!}`;
        const destinationHref = `${pr.destination!.repository!.links!.html!.href}/src/${pr.destination!.commit!.hash}/?at=${pr.destination!.branch!.name!}`;
        return (
            <React.Fragment>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Spacer>
                        <Avatar
                            appearance="circle"
                            name={pr.author!.display_name}
                            src={pr.author!.links!.avatar!.href}
                            size="small"
                        />
                    </Spacer>
                    <DropdownMenu
                        trigger={
                            <FixedWidth>
                                <Tooltip content={`${sourcePrefix}${pr.source!.branch!.name}`} position="top">
                                    <Button
                                        className='ak-button'
                                        shouldFitContainer
                                        spacing='compact'
                                        iconBefore={<BitbucketBranchesIcon label='branch' size='small' />}
                                        iconAfter={<ChevronDownIcon label='dropdown' size='medium' />}
                                        isLoading={this.state.loading}
                                    >
                                        {sourcePrefix}{pr.source!.branch!.name}
                                    </Button>
                                </Tooltip>
                            </FixedWidth>
                        }
                    >
                        <DropdownItemGroup>
                            <DropdownItem className='ak-dropdown-item' onClick={() => this.handleCheckout(pr.source!.branch!.name!, true)}>Checkout branch</DropdownItem>
                            <DropdownItem className='ak-dropdown-item' href={sourceHref}>Open branch on bitbucket.org</DropdownItem>
                        </DropdownItemGroup>
                    </DropdownMenu>
                    <Spacer>
                        <Arrow label="" size="small" />
                    </Spacer>
                    <FixedWidth>
                        <Tooltip content={`${destinationPrefix}${pr.destination!.branch!.name}`} position="top">
                            <DropdownMenu
                                trigger={
                                    <FixedWidth>
                                        <Tooltip content={`${destinationPrefix}${pr.destination!.branch!.name}`} position="top">
                                            <Button
                                                className='ak-button'
                                                shouldFitContainer
                                                spacing='compact'
                                                iconBefore={<BitbucketBranchesIcon label='branch' size='small' />}
                                                iconAfter={<ChevronDownIcon label='dropdown' size='medium' />}
                                                isLoading={this.state.loading}
                                            >
                                                {destinationPrefix}{pr.destination!.branch!.name}
                                            </Button>
                                        </Tooltip>
                                    </FixedWidth>
                                }>
                                <DropdownItemGroup>
                                    <DropdownItem className='ak-dropdown-item' onClick={() => this.handleCheckout(pr.destination!.branch!.name!, false)}>Checkout branch</DropdownItem>
                                    <DropdownItem className='ak-dropdown-item' href={destinationHref}>Open branch on bitbucket.org</DropdownItem>
                                </DropdownItemGroup>
                            </DropdownMenu>
                        </Tooltip>
                    </FixedWidth>
                </div >
                {this.props.prData.currentBranch === pr.source!.branch!.name && <Tag text="✔ Checked out" color="blueLight" />}
                {
                    this.props.error &&
                    <Tooltip content={this.props.error} type="warning">
                        <Button appearance="subtle-link" spacing="none" iconBefore={<WarningIcon label="" size="small" />}>Checkout error</Button>
                    </Tooltip>
                }
            </React.Fragment >
        );
    }
}
import * as React from 'react';
import Arrow from '@atlaskit/icon/glyph/arrow-right';
import DropdownMenu, { DropdownItemGroup, DropdownItem } from '@atlaskit/dropdown-menu';
import Tag from '@atlaskit/tag';
import { PRData } from '../../../ipc/prMessaging';
import { Checkout } from '../../../ipc/prActions';

export default class BranchInfo extends React.Component<{ prData: PRData, postMessage: (e: Checkout) => void }, { loading: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { loading: false };
    }

    componentDidUpdate(prevProps: any) {
        if (prevProps.prData.currentBranch !== this.props.prData.currentBranch) {
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
                    <DropdownMenu trigger={pr.source!.branch!.name} triggerType="button" triggerButtonProps={{ spacing: 'compact', isLoading: this.state.loading }}>
                        <DropdownItemGroup>
                            <DropdownItem onClick={() => this.handleCheckout(pr.source!.branch!.name!)}>Checkout branch</DropdownItem>
                            <DropdownItem href={`${pr.source!.repository!.links!.html!.href}/src/${pr.source!.branch!.name}`}>Open branch on bitbucket.com</DropdownItem>
                        </DropdownItemGroup>
                    </DropdownMenu>
                    <Arrow label="" size="small" />
                    <DropdownMenu trigger={pr.destination!.branch!.name} triggerType="button" triggerButtonProps={{ spacing: 'compact', isLoading: this.state.loading }}>
                        <DropdownItemGroup>
                            <DropdownItem onClick={() => this.handleCheckout(pr.destination!.branch!.name!)}>Checkout branch</DropdownItem>
                            <DropdownItem href={`${pr.destination!.repository!.links!.html!.href}/src/${pr.destination!.branch!.name}`}>Open branch on bitbucket.com</DropdownItem>
                        </DropdownItemGroup>
                    </DropdownMenu>
                </div>
                {this.props.prData.currentBranch === pr.source!.branch!.name && <Tag text="✔ Checked out" color="blueLight" />}
            </React.Fragment>
        );
    }
}
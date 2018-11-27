import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { ConfigData } from '../../../ipc/configMessaging';
import styled from 'styled-components';
// import DropdownMenu, { DropdownItemGroup, DropdownItem } from '@atlaskit/dropdown-menu';


type changeObject = {[key: string]:any};

export const InlineFlex = styled.div`
display: inline-flex;
align-items: center;
justify-content: space-between;
width: 100%;
`;


export default class BitbucketExplorer extends React.Component<{ configData: ConfigData, onConfigChange: (changes:changeObject, removes?:string[]) => void }, {}> {
    constructor(props: any) {
        super(props);
    }

    onCheckboxChange = (e:any) => {
        console.log('explorer clicked',e.target.value, e.target.checked);
        const changes = Object.create(null);
        changes[e.target.value] = e.target.checked;

        if(this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    }

    checklabel = (label:string) => <span className='checkboxLabel'>{label}</span>;

    render() {
        // let  siteSelect = <div></div>;
        // const sites = this.props.configData.authInfo.accessibleResources;

        // if(sites && sites.length > 1) {
        //     const selectedSite = this.props.configData.config.jira.workingSite;
        //     let siteItems:any[] = [];
        //     sites.forEach(site => {
        //         if(this.props.configData.config.jira.workingSite.id !== site.id){
        //             siteItems.push(
        //                 <DropdownItem
        //                     className='ak-dropdown-item'
        //                     id={site.name}
        //                     data-site-id={site.id}
        //                     onClick={this.onHandleSiteChange}>
        //                     {site.name}
        //                 </DropdownItem>
        //             );
        //         }
        //     });

        //     siteSelect = <div className='labelAndSelect'><span>default site:</span> <DropdownMenu
        //                             triggerType="button"
        //                             trigger={selectedSite.name}
        //                             triggerButtonProps={{className:'ak-button'}}
        //                         >
        //                             <DropdownItemGroup>
        //                             {siteItems}
        //                             </DropdownItemGroup>
        //                         </DropdownMenu>
        //                     </div>;
        // }

        return (
            <div>
                <div>
                    <Checkbox
                    value="bitbucket.explorer.enabled"
                    label={this.checklabel("Enable Bitbucket Pull Request Explorer")}
                    isChecked={this.props.configData.config.bitbucket.explorer.enabled}
                    onChange={this.onCheckboxChange}
                    name="pr-explorer-enabled"/>
                    {/* <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            paddingLeft: '24px',
                        }}
                        >
                        <Checkbox
                            isChecked={this.props.configData.config.jira.explorer.showOpenIssues}
                            onChange={this.onCheckboxChange}
                            label={this.checklabel("Show My Open Issues")}
                            value="jira.explorer.showOpenIssues"
                            name="explorer-openissues"
                        />
                        <Checkbox
                            isChecked={this.props.configData.config.jira.explorer.showAssignedIssues}
                            onChange={this.onCheckboxChange}
                            label={this.checklabel("Show My Assigned Issues")}
                            value="jira.explorer.showAssignedIssues"
                            name="explorer-assigned-issues"
                        />
                    </div>
                </div>
                <hr/>
                <InlineFlex>
                    {siteSelect}
                    {projectSelect}
                </InlineFlex> */}
            </div>
            </div>
            
        );
    }
}

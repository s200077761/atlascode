import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { ConfigData } from '../../../ipc/configMessaging';
import DropdownMenu, { DropdownItemGroup, DropdownItem } from '@atlaskit/dropdown-menu';
import { BitbucketExplorerLocation } from '../../../config/model';


type changeObject = {[key: string]:any};

export default class BitbucketExplorer extends React.Component<{ configData: ConfigData, onConfigChange: (changes:changeObject, removes?:string[]) => void }, {}> {
    constructor(props: any) {
        super(props);
    }

    onCheckboxChange = (e:any) => {
        const changes = Object.create(null);
        changes[e.target.value] = e.target.checked;

        if(this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    }

    onHandleLocationChange = (item:any) => {
        const loc = item.target.parentNode.parentNode.id;
        if(loc) {
            const changes = Object.create(null);
            changes['bitbucket.explorer.location'] = loc;

            if(this.props.onConfigChange) {
                this.props.onConfigChange(changes);
            }
        }
    }

    checklabel = (label:string) => <span className='checkboxLabel'>{label}</span>;

    render() {
        let  locationSelect = <div></div>;
        
        const locations = Object.keys(BitbucketExplorerLocation)
                                .map((key:any) => BitbucketExplorerLocation[key]);
        console.log('got locations',locations);
        if(locations && locations.length > 1) {
            const selectedLocation = this.props.configData.config.bitbucket.explorer.location;
            let locItems:any[] = [];
            locations.forEach(loc => {
                if(this.props.configData.config.bitbucket.explorer.location !== loc){
                    locItems.push(
                        <DropdownItem
                            className='ak-dropdown-item'
                            id={loc}
                            onClick={this.onHandleLocationChange}>
                            {loc}
                        </DropdownItem>
                    );
                }
            });

            locationSelect = <div className='labelAndSelect'><span>show in:</span> <DropdownMenu
                                    triggerType="button"
                                    trigger={selectedLocation}
                                    triggerButtonProps={{className:'ak-button', 
                                    isDisabled: !this.props.configData.config.bitbucket.explorer.enabled}}
                                >
                                    <DropdownItemGroup>
                                    {locItems}
                                    </DropdownItemGroup>
                                </DropdownMenu>
                            </div>;
        }

        return (
            <div>
                <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            paddingLeft: '24px',
                        }}>

                    <Checkbox
                        value="bitbucket.explorer.enabled"
                        label={this.checklabel("Enable Bitbucket Pull Request Explorer")}
                        isChecked={this.props.configData.config.bitbucket.explorer.enabled}
                        onChange={this.onCheckboxChange}
                        name="pr-explorer-enabled"/>

                    <div style={{ marginLeft:'3em' }}>
                        {locationSelect}
                    </div>

                    <Checkbox
                        value="bitbucket.explorer.relatedJiraIssues.enabled"
                        label={this.checklabel("Show related Jira issues for Bitbucket pull requests")}
                        isChecked={this.props.configData.config.bitbucket.explorer.relatedJiraIssues.enabled}
                        onChange={this.onCheckboxChange}
                        name="pr-explorer-relatedjiraissues-enabled"/>

                </div>
            </div>
            
        );
    }
}

import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { ConfigData } from '../../../ipc/configMessaging';

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

    handleInputChange = (e:any, configKey:string) => {
        const changes = Object.create(null);
        changes[configKey] = e.target.value;

        if(this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    }

    checklabel = (label:string) => <span className='checkboxLabel'>{label}</span>;

    render() {
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

                    <div className="refreshInterval"  style={{ marginLeft: '3em' }}>
                        <span>refresh every: </span>
                        <input style={{ width: '40px' }} name="pr-explorer-refresh-interval"
                            type="number" min="0"
                            value={this.props.configData.config.bitbucket.explorer.refreshInterval}
                            onChange={(e: any) => this.handleInputChange(e, "bitbucket.explorer.refreshInterval")} />
                        <span> minutes (setting to 0 disables auto-refresh)</span>
                    </div>

                    <Checkbox
                        value="bitbucket.explorer.relatedJiraIssues.enabled"
                        label={this.checklabel("Show related Jira issues for Bitbucket pull requests")}
                        isChecked={this.props.configData.config.bitbucket.explorer.relatedJiraIssues.enabled}
                        onChange={this.onCheckboxChange}
                        name="pr-explorer-relatedjiraissues-enabled"/>

                    <Checkbox
                        value="bitbucket.explorer.notifications.pullRequestCreated"
                        label={this.checklabel("Periodically check for newly created pull reqeuests and show an information message if there are any")}
                        isChecked={this.props.configData.config.bitbucket.explorer.notifications.pullRequestCreated}
                        onChange={this.onCheckboxChange}
                        name="pr-explorer-notifications-prcreated"/>

                    <div className="refreshInterval" style={{ marginLeft: '3em' }}>
                        <span>check every: </span>
                        <input style={{width: '40px'}} name="pr-notifications-refresh-interval"
                            type="number" min="1"
                            value={this.props.configData.config.bitbucket.explorer.notifications.refreshInterval}
                            onChange={(e:any) => this.handleInputChange(e, "bitbucket.explorer.notifications.refreshInterval")} />
                        <span> minutes</span>
                    </div>
                </div>
            </div>
            
        );
    }
}

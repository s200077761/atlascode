import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { ConfigData } from '../../../ipc/configMessaging';

type changeObject = {[key: string]:any};

export default class StatusBar extends React.Component<{ configData: ConfigData, onConfigChange: (changes:changeObject, removes?:string[]) => void }, {}> {
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

    checklabel = (label:string) => <span className='checkboxLabel'>{label}</span>;

    render() {
        return (
            <div>
                <div>
                    <h3>Jira</h3>
                    <Checkbox
                    value="jira.statusbar.enabled"
                    label={this.checklabel("Enable Jira Status Bar")}
                    isChecked={this.props.configData.config.jira.statusbar.enabled}
                    onChange={this.onCheckboxChange}
                    name="jira-status-enabled"/>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            paddingLeft: '24px',
                        }}>
                        <Checkbox
                            isChecked={this.props.configData.config.jira.statusbar.showProduct}
                            onChange={this.onCheckboxChange}
                            label={this.checklabel("Show product name")}
                            value="jira.statusbar.showProduct"
                            name="jira-status-product"
                        />
                        <Checkbox
                            isChecked={this.props.configData.config.jira.statusbar.showUser}
                            onChange={this.onCheckboxChange}
                            label={this.checklabel("Show user's name")}
                            value="jira.statusbar.showUser"
                            name="jira-status-user"
                        />
                        <Checkbox
                            isChecked={this.props.configData.config.jira.statusbar.showSite}
                            onChange={this.onCheckboxChange}
                            label={this.checklabel("Show default site")}
                            value="jira.statusbar.showSite"
                            name="jira-status-site"
                        />
                        <Checkbox
                            isChecked={this.props.configData.config.jira.statusbar.showProject}
                            onChange={this.onCheckboxChange}
                            label={this.checklabel("Show default project")}
                            value="jira.statusbar.showProject"
                            name="jira-status-project"
                        />
                        <Checkbox
                            isChecked={this.props.configData.config.jira.statusbar.showLogin}
                            onChange={this.onCheckboxChange}
                            label={this.checklabel("Show login button when not authenticated")}
                            value="jira.statusbar.showLogin"
                            name="jira-status-login"
                        />
                    </div>
                    <h3>Bitbucket</h3>
                    <Checkbox
                    value="bitbucket.statusbar.enabled"
                    label={this.checklabel("Enable Bitbucket Status Bar")}
                    isChecked={this.props.configData.config.bitbucket.statusbar.enabled}
                    onChange={this.onCheckboxChange}
                    name="bitbucket-status-enabled"/>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            paddingLeft: '24px',
                        }}>
                        <Checkbox
                            isChecked={this.props.configData.config.bitbucket.statusbar.showProduct}
                            onChange={this.onCheckboxChange}
                            label={this.checklabel("Show product name")}
                            value="bitbucket.statusbar.showProduct"
                            name="bitbucket-status-product"
                        />
                        <Checkbox
                            isChecked={this.props.configData.config.bitbucket.statusbar.showUser}
                            onChange={this.onCheckboxChange}
                            label={this.checklabel("Show user's name")}
                            value="bitbucket.statusbar.showUser"
                            name="bitbucket-status-user"
                        />
                        <Checkbox
                            isChecked={this.props.configData.config.bitbucket.statusbar.showLogin}
                            onChange={this.onCheckboxChange}
                            label={this.checklabel("Show login button when not authenticated")}
                            value="bitbucket.statusbar.showLogin"
                            name="bitbucket-status-login"
                        />
                    </div>
                </div>
            </div>
            
        );
    }
}

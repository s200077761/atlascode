import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { ConfigData, emptyConfigData } from '../../../ipc/configMessaging';
import { CheckboxField } from '@atlaskit/form';
import { chain } from '../fieldValidators';

type changeObject = { [key: string]: any };

export default class JiraExplorer extends React.Component<{ configData: ConfigData, onConfigChange: (changes: changeObject, removes?: string[]) => void }, ConfigData> {

    constructor(props: any) {
        super(props);

        this.state = emptyConfigData;
    }

    onCheckboxChange = (e: any) => {
        const changes = Object.create(null);
        changes[e.target.value] = e.target.checked;

        if (this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    }

    handleNumberChange = (e: any, configKey: string) => {
        const changes = Object.create(null);
        changes[configKey] = +e.target.value;

        if (this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    }

    getIsExplorerIndeterminate = (): boolean => {
        if (!this.props.configData.config.jira.explorer.enabled) {
            return false;
        }

        let count = 0;
        if (this.props.configData.config.jira.explorer.showAssignedIssues) {
            count++;
        }
        if (this.props.configData.config.jira.explorer.showOpenIssues) {
            count++;
        }

        return (count < 2);
    }

    render() {

        return (

            <div>
                <CheckboxField
                    name='issue-explorer-enabled'
                    id='issue-explorer-enabled'
                    value='jira.explorer.enabled'
                    defaultIsChecked={this.props.configData.config.jira.explorer.enabled}>
                    {
                        (fieldArgs: any) => {
                            return (
                                <Checkbox {...fieldArgs.fieldProps}
                                    label='Enable Jira Issue Explorer'
                                    isIndeterminate={this.getIsExplorerIndeterminate()}
                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                />
                            );
                        }
                    }
                </CheckboxField>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        paddingLeft: '24px',
                    }}
                >
                    <CheckboxField
                        name='explorer-openissues'
                        id='explorer-openissues'
                        value='jira.explorer.showOpenIssues'
                        defaultIsChecked={this.props.configData.config.jira.explorer.showOpenIssues}>
                        {
                            (fieldArgs: any) => {
                                return (
                                    <Checkbox {...fieldArgs.fieldProps}
                                        label='Show My Open Issues'
                                        onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                        isDisabled={!this.props.configData.config.jira.explorer.enabled}
                                    />
                                );
                            }
                        }
                    </CheckboxField>
                    <CheckboxField
                        name='explorer-assigned-issues'
                        id='explorer-assigned-issues'
                        value='jira.explorer.showAssignedIssues'
                        defaultIsChecked={this.props.configData.config.jira.explorer.showAssignedIssues}>
                        {
                            (fieldArgs: any) => {
                                return (
                                    <Checkbox {...fieldArgs.fieldProps}
                                        label='Show My Assigned Issues'
                                        onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                        isDisabled={!this.props.configData.config.jira.explorer.enabled}
                                    />
                                );
                            }
                        }
                    </CheckboxField>
                </div>
                <div className="refreshInterval">
                    <span>Refresh explorer every: </span>
                    <input className='ac-inputField-inline' style={{ width: '60px' }} name="jira-explorer-refresh-interval"
                        type="number" min="0"
                        value={this.props.configData.config.jira.explorer.refreshInterval}
                        onChange={(e: any) => this.handleNumberChange(e, "jira.explorer.refreshInterval")}
                        disabled={!this.props.configData.config.jira.explorer.enabled} />
                    <span> minutes (setting to 0 disables auto-refresh)</span>
                </div>
                <div className="refreshInterval">
                    <span>Notify of new Jira issues: </span>
                    <input className='ac-inputField-inline' style={{ width: '60px' }} name="jira-issue-monitor-refresh-interval"
                        type="number" min="0"
                        value={this.props.configData.config.jira.issueMonitor.refreshInterval}
                        onChange={(e: any) => this.handleNumberChange(e, "jira.issueMonitor.refreshInterval")}
                        disabled={!this.props.configData.config.jira.explorer.enabled} />
                    <span> minutes (setting to 0 disables notification)</span>
                </div>
            </div>

        );
    }
}

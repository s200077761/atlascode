import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { CheckboxField } from '@atlaskit/form';
import { ConfigData } from '../../../ipc/configMessaging';
import { chain } from '../fieldValidators';

type changeObject = { [key: string]: any };

export default class BitbucketIssuesConfig extends React.Component<{ configData: ConfigData, onConfigChange: (changes: changeObject, removes?: string[]) => void }, {}> {
    constructor(props: any) {
        super(props);
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

    render() {
        return (
            <div>
                <CheckboxField
                    name='bb-issues-explorer-enabled'
                    id='bb-issues-explorer-enabled'
                    value='bitbucket.issues.explorerEnabled'>
                    {
                        (fieldArgs: any) => {
                            return (
                                <Checkbox {...fieldArgs.fieldProps}
                                    label='Enable Bitbucket Issues Explorer'
                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                    isChecked={this.props.configData.config.bitbucket.issues.explorerEnabled}
                                />
                            );
                        }
                    }
                </CheckboxField>
                <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '24px', }} >
                    <CheckboxField
                        name="bb-issues-monitor-enabled"
                        id="bb-issues-monitor-enabled"
                        value="bitbucket.issues.monitorEnabled"
                    >
                        {(fieldArgs: any) => {
                            return (
                                <Checkbox
                                    {...fieldArgs.fieldProps}
                                    label="Enable Bitbucket Issues Monitor to notify when new issues are created"
                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                    isDisabled={!this.props.configData.config.bitbucket.issues.explorerEnabled}
                                    isChecked={this.props.configData.config.bitbucket.issues.monitorEnabled}
                                />
                            );
                        }}
                    </CheckboxField>
                </div>
                <div className='refreshInterval'>
                    <span>Refresh explorer every: </span>
                    <input className='ac-inputField-inline' style={{ width: '60px' }} name='bb-issues-refresh-interval'
                        type='number' min='0'
                        value={this.props.configData.config.bitbucket.issues.refreshInterval}
                        onChange={(e: any) => this.handleNumberChange(e, 'bitbucket.issues.refreshInterval')}
                        disabled={!this.props.configData.config.bitbucket.issues.explorerEnabled} />
                    <span> minutes (setting to 0 disables auto-refresh)</span>
                </div>
                <div>
                    <CheckboxField
                        name='bb-issues-jiracreate-enabled'
                        id='bb-issues-jiracreate-enabled'
                        value='bitbucket.issues.createJiraEnabled'>
                        {
                            (fieldArgs: any) => {
                                return (
                                    <Checkbox {...fieldArgs.fieldProps}
                                        label='Show Create Jirra Issue button on Bitbucket issue screens'
                                        onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                        isChecked={this.props.configData.config.bitbucket.issues.createJiraEnabled}
                                    />
                                );
                            }
                        }
                    </CheckboxField>
                </div>
            </div>
        );
    }
}

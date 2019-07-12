import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { CheckboxField } from '@atlaskit/form';
import { ConfigData } from '../../../ipc/configMessaging';
import { chain } from '../fieldValidators';

type changeObject = { [key: string]: any };

export default class JiraStatusBar extends React.Component<{ configData: ConfigData, onConfigChange: (changes: changeObject, removes?: string[]) => void }, {}> {
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

    render() {
        return (
            <div>
                <div>
                    <CheckboxField
                        name='jira-status-enabled'
                        id='jira-status-enabled'
                        value='jira.statusbar.enabled'>
                        {
                            (fieldArgs: any) => {
                                return (
                                    <Checkbox {...fieldArgs.fieldProps}
                                        label='Enable Jira Status Bar'
                                        onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                        isChecked={this.props.configData.config.jira.statusbar.enabled}
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
                            name='jira-status-product'
                            id='jira-status-product'
                            value='jira.statusbar.showProduct'>
                            {
                                (fieldArgs: any) => {
                                    return (
                                        <Checkbox {...fieldArgs.fieldProps}
                                            label='Show product name'
                                            onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                            isDisabled={!this.props.configData.config.jira.statusbar.enabled}
                                            isChecked={this.props.configData.config.jira.statusbar.showProduct}
                                        />
                                    );
                                }
                            }
                        </CheckboxField>

                        <CheckboxField
                            name='jira-status-user'
                            id='jira-status-user'
                            value='jira.statusbar.showUser'>
                            {
                                (fieldArgs: any) => {
                                    return (
                                        <Checkbox {...fieldArgs.fieldProps}
                                            label="Show user's name"
                                            onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                            isDisabled={!this.props.configData.config.jira.statusbar.enabled}
                                            isChecked={this.props.configData.config.jira.statusbar.showUser}
                                        />
                                    );
                                }
                            }
                        </CheckboxField>

                        <CheckboxField
                            name='jira-status-site'
                            id='jira-status-site'
                            value='jira.statusbar.showSite'>
                            {
                                (fieldArgs: any) => {
                                    return (
                                        <Checkbox {...fieldArgs.fieldProps}
                                            label='Show default site'
                                            onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                            isDisabled={!this.props.configData.config.jira.statusbar.enabled}
                                            isChecked={this.props.configData.config.jira.statusbar.showSite}
                                        />
                                    );
                                }
                            }
                        </CheckboxField>

                        <CheckboxField
                            name='jira-status-project'
                            id='jira-status-project'
                            value='jira.statusbar.showProject'>
                            {
                                (fieldArgs: any) => {
                                    return (
                                        <Checkbox {...fieldArgs.fieldProps}
                                            label='Show default project'
                                            onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                            isDisabled={!this.props.configData.config.jira.statusbar.enabled}
                                            isChecked={this.props.configData.config.jira.statusbar.showProject}
                                        />
                                    );
                                }
                            }
                        </CheckboxField>

                        <CheckboxField
                            name='jira-status-login'
                            id='jira-status-login'
                            value='jira.statusbar.showLogin'>
                            {
                                (fieldArgs: any) => {
                                    return (
                                        <Checkbox {...fieldArgs.fieldProps}
                                            label='Show login button when not authenticated'
                                            onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                            isDisabled={!this.props.configData.config.jira.statusbar.enabled}
                                            isChecked={this.props.configData.config.jira.statusbar.showLogin}
                                        />
                                    );
                                }
                            }
                        </CheckboxField>
                    </div>
                </div>
            </div>

        );
    }
}

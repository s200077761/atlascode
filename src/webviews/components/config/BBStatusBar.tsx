import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { CheckboxField } from '@atlaskit/form';
import { chain } from '../fieldValidators';
import { IConfig } from '../../../config/model';

type changeObject = { [key: string]: any };

export default class BBStatusBar extends React.Component<
    { config: IConfig; onConfigChange: (changes: changeObject, removes?: string[]) => void },
    {}
> {
    constructor(props: any) {
        super(props);
    }

    onCheckboxChange = (e: any) => {
        const changes = Object.create(null);
        changes[e.target.value] = e.target.checked;

        if (this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    };

    render() {
        return (
            <div>
                <CheckboxField
                    name="bitbucket-status-enabled"
                    id="bitbucket-status-enabled"
                    value="bitbucket.statusbar.enabled"
                >
                    {(fieldArgs: any) => {
                        return (
                            <Checkbox
                                {...fieldArgs.fieldProps}
                                label="Enable Bitbucket Status Bar"
                                onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                isChecked={this.props.config.bitbucket.statusbar.enabled}
                            />
                        );
                    }}
                </CheckboxField>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        paddingLeft: '24px'
                    }}
                >
                    <CheckboxField
                        name="bitbucket-status-product"
                        id="bitbucket-status-product"
                        value="bitbucket.statusbar.showProduct"
                    >
                        {(fieldArgs: any) => {
                            return (
                                <Checkbox
                                    {...fieldArgs.fieldProps}
                                    label="Show product name"
                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                    isDisabled={!this.props.config.bitbucket.statusbar.enabled}
                                    isChecked={this.props.config.bitbucket.statusbar.showProduct}
                                />
                            );
                        }}
                    </CheckboxField>

                    <CheckboxField
                        name="bitbucket-status-user"
                        id="bitbucket-status-user"
                        value="bitbucket.statusbar.showUser"
                        t
                    >
                        {(fieldArgs: any) => {
                            return (
                                <Checkbox
                                    {...fieldArgs.fieldProps}
                                    label="Show user's name"
                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                    isDisabled={!this.props.config.bitbucket.statusbar.enabled}
                                    isChecked={this.props.config.bitbucket.statusbar.showUser}
                                />
                            );
                        }}
                    </CheckboxField>

                    <CheckboxField
                        name="bitbucket-status-login"
                        id="bitbucket-status-login"
                        value="bitbucket.statusbar.showLogin"
                    >
                        {(fieldArgs: any) => {
                            return (
                                <Checkbox
                                    {...fieldArgs.fieldProps}
                                    label="Show login button when not authenticated"
                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                    isDisabled={!this.props.config.bitbucket.statusbar.enabled}
                                    isChecked={this.props.config.bitbucket.statusbar.showLogin}
                                />
                            );
                        }}
                    </CheckboxField>
                </div>
            </div>
        );
    }
}

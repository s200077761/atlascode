import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { CheckboxField } from '@atlaskit/form';
import { chain } from '../fieldValidators';

type changeObject = { [key: string]: any };

export default class ProductEnabler extends React.Component<{
    jiraEnabled: boolean,
    bbEnabled: boolean,
    onConfigChange: (changes: changeObject, removes?: string[]) => void
}, {
    jiraEnabled: boolean,
    bbEnabled: boolean
}> {

    constructor(props: any) {
        super(props);

        this.state = { jiraEnabled: props.jiraEnabled, bbEnabled: props.bbEnabled, };
    }

    componentWillReceiveProps = (nextProps: any) => {
        this.setState({ jiraEnabled: nextProps.jiraEnabled, bbEnabled: nextProps.bbEnabled, });
    };

    onCheckboxChange = (e: any) => {
        const changes = Object.create(null);
        changes[e.target.value] = e.target.checked;

        if (this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    };

    render() {
        return (
            <div className="productEnabler">
                <CheckboxField
                    name='jira-enabled'
                    id='jira-enabled'
                    value='jira.enabled'>
                    {
                        (fieldArgs: any) => {
                            return (
                                <Checkbox {...fieldArgs.fieldProps}
                                    label='Enable Jira Features'
                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                    isChecked={this.state.jiraEnabled}
                                />
                            );
                        }
                    }
                </CheckboxField>
                <CheckboxField
                    name='bitbucket-enabled'
                    id='bitbucket-enabled'
                    value='bitbucket.enabled'>
                    {
                        (fieldArgs: any) => {
                            return (
                                <Checkbox {...fieldArgs.fieldProps}
                                    label='Enable Bitbucket Features'
                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                    isChecked={this.state.bbEnabled}
                                />
                            );
                        }
                    }
                </CheckboxField>
            </div>
        );
    }
}

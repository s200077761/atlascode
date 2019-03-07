import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { CheckboxField } from '@atlaskit/form';
import { ConfigData } from '../../../ipc/configMessaging';
import { chain } from '../fieldValidators';

type changeObject = { [key: string]: any };

export default class JiraHover extends React.Component<{ configData: ConfigData, onConfigChange: (changes: changeObject, removes?: string[]) => void }, {}> {
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
            <CheckboxField
                name='jira-hover-enabled'
                id='jira-hover-enabled'
                value='jira.hover.enabled'>
                {
                    (fieldArgs: any) => {
                        return (
                            <Checkbox {...fieldArgs.fieldProps}
                                label='Show details when hovering over issue keys in the editor'
                                onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                isChecked={this.props.configData.config.jira.hover.enabled}
                            />
                        );
                    }
                }
            </CheckboxField>
        );
    }
}

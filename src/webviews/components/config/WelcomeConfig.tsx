import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { CheckboxField } from '@atlaskit/form';
import { chain } from '../fieldValidators';
import { IConfig } from '../../../config/model';

type changeObject = { [key: string]: any };

export default class WelcomeConfig extends React.Component<{ config: IConfig, onConfigChange: (changes: changeObject, removes?: string[]) => void }, {}> {
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
                name='show-welcome-enabled'
                id='show-welcome-enabled'
                value='showWelcomeOnInstall'>
                {
                    (fieldArgs: any) => {
                        return (
                            <Checkbox {...fieldArgs.fieldProps}
                                label='Show welcome screen when extension is updated'
                                onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                isChecked={this.props.config.showWelcomeOnInstall}
                            />
                        );
                    }
                }
            </CheckboxField>
        );
    }
}

import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { ConfigData } from '../../../ipc/configMessaging';

type changeObject = { [key: string]: any };

export default class WelcomeConfig extends React.Component<{ configData: ConfigData, onConfigChange: (changes: changeObject, removes?: string[]) => void }, {}> {
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

    checklabel = (label: string) => <span className='checkboxLabel'>{label}</span>;

    render() {
        return (
            <Checkbox
                value={"showWelcomeOnInstall"}
                label={this.checklabel("Show welcome screen when extension is updated")}
                isChecked={this.props.configData.config.showWelcomeOnInstall}
                onChange={this.onCheckboxChange}
                name="bitbucket-contextmenus-enabled" />
        );
    }
}

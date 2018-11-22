import * as React from 'react';
import { IConfig } from '../../../config/model';
import { Checkbox } from '@atlaskit/checkbox';
type changeObject = {[key: string]:any};

export default class JiraExplorer extends React.Component<{ config: IConfig, onConfigChange: (changes:changeObject) => void }, {}> {
    constructor(props: any) {
        super(props);
    }

    onChange = (e:any) => {
        console.log('exploere clicked',e.target.value, e.target.checked);
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
                <Checkbox
                value="jira.explorer.enabled"
                label={this.checklabel("Enable Jira Issue Explorer")}
                isChecked={this.props.config.jira.explorer.enabled}
                onChange={this.onChange}
                name="issue-explorer-enabled"
                />
            </div>
        );
    }
}

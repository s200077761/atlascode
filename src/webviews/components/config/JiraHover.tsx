import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { ConfigData } from '../../../ipc/configMessaging';
import styled from 'styled-components';

type changeObject = { [key: string]: any };

export const InlineFlex = styled.div`
display: inline-flex;
align-items: center;
justify-content: space-between;
width: 100%;
`;

export default class JiraHover extends React.Component<{ configData: ConfigData, onConfigChange: (changes: changeObject, removes?: string[]) => void }, {}> {
    constructor(props: any) {
        super(props);
    }

    onCheckboxChange = (e: any) => {
        console.log('explorer clicked', e.target.value, e.target.checked);
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
                value={"jira.hover.enabled"}
                label={this.checklabel("Enable Jira hover provider")}
                isChecked={this.props.configData.config.jira.hover.enabled}
                onChange={this.onCheckboxChange}
                name="jira-hover-enabled" />
        );
    }
}

import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { ConfigData } from '../../../ipc/configMessaging';

type changeObject = { [key: string]: any };

export default class PipelinesConfig extends React.Component<{ configData: ConfigData, onConfigChange: (changes: changeObject, removes?: string[]) => void }, {}> {
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

    handleInputChange = (e: any, configKey: string) => {
        const changes = Object.create(null);
        changes[configKey] = e.target.value;

        if(this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    }

    checklabel = (label: string) => <span className='checkboxLabel'>{label}</span>;

    render() {
        return (
            <div>
            <Checkbox
                value={"bitbucket.pipelines.explorerEnabled"}
                label={this.checklabel("Enable Bitbucket Pipelines Explorer")}
                isChecked={this.props.configData.config.bitbucket.pipelines.explorerEnabled}
                onChange={this.onCheckboxChange}
                name="pipelines-explorer-enabled" />
            <Checkbox
                value={"bitbucket.pipelines.monitorEnabled"}
                label={this.checklabel("Enable Pipelines Build Status Monitor")}
                isChecked={this.props.configData.config.bitbucket.pipelines.monitorEnabled}
                onChange={this.onCheckboxChange}
                name="pipelines-monitor-enabled" />
                <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    paddingLeft: '24px',
                }}
                >
                    <div className="refreshInterval">
                    <span>refresh every: </span>
                    <input style={{ width: '40px' }}
                        disabled={!this.props.configData.config.bitbucket.pipelines.explorerEnabled && !this.props.configData.config.bitbucket.pipelines.monitorEnabled}
                        name="pipelines-refresh-interval"
                        type="number" min="1"
                        value={this.props.configData.config.bitbucket.pipelines.refreshInterval}
                        onChange={(e: any) => this.handleInputChange(e, "bitbucket.pipelines.refreshInterval")} />
                    <span> minutes</span>
                    </div>
                </div>
            </div>
        );
    }
}

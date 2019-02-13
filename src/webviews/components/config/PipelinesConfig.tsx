import * as React from "react";
import { Checkbox } from "@atlaskit/checkbox";
import { CheckboxField } from "@atlaskit/form";
import { ConfigData } from "../../../ipc/configMessaging";
import { chain } from "../fieldValidators";

type changeObject = { [key: string]: any };

export default class PipelinesConfig extends React.Component<{ configData: ConfigData; onConfigChange: (changes: changeObject, removes?: string[]) => void; }, {}> {
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
          name="pipelines-explorer-enabled"
          id="pipelines-explorer-enabled"
          value="bitbucket.pipelines.explorerEnabled"
          defaultIsChecked={this.props.configData.config.bitbucket.pipelines.explorerEnabled}
        >
          {(fieldArgs: any) => {
            return (
              <Checkbox
                {...fieldArgs.fieldProps}
                label="Enable Bitbucket Pipelines Explorer"
                onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
              />
            );
          }}
        </CheckboxField>

        <CheckboxField
          name="pipelines-monitor-enabled"
          id="pipelines-monitor-enabled"
          value="bitbucket.pipelines.monitorEnabled"
          defaultIsChecked={this.props.configData.config.bitbucket.pipelines.monitorEnabled}
        >
          {(fieldArgs: any) => {
            return (
              <Checkbox
                {...fieldArgs.fieldProps}
                label="Enable Pipelines Build Status Monitor"
                onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                isDisabled={!this.props.configData.config.bitbucket.pipelines.explorerEnabled}
              />
            );
          }}
        </CheckboxField>
        <div className="refreshInterval">
          <span>Refresh explorer every: </span>
          <input className='ak-inputField-inline' style={{ width: '60px' }} name="pipelines-refresh-interval"
            type="number" min="0"
            value={this.props.configData.config.bitbucket.pipelines.refreshInterval}
            onChange={(e: any) => this.handleNumberChange(e, "bitbucket.pipelines.refreshInterval")}
            disabled={!this.props.configData.config.bitbucket.pipelines.explorerEnabled} />
          <span> minutes (setting to 0 disables auto-refresh)</span>
        </div>
      </div>
    );
  }
}

import * as React from "react";
import { Checkbox } from "@atlaskit/checkbox";
import { CheckboxField } from "@atlaskit/form";
import { ConfigData } from "../../../ipc/configMessaging";
import { chain } from "../fieldValidators";
import MultiOptionList from "./MultiOptionList";

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

  getIsExplorerIndeterminate = (): boolean => {
    if (!this.props.configData.config.bitbucket.pipelines.explorerEnabled) {
      return false;
    }

    let count = 0;
    if (this.props.configData.config.bitbucket.pipelines.monitorEnabled) {
      count++;
    }

    return (count < 1);
  }

  render() {
    return (
      <div>
        <CheckboxField
          name="pipelines-explorer-enabled"
          id="pipelines-explorer-enabled"
          value="bitbucket.pipelines.explorerEnabled"
        >
          {(fieldArgs: any) => {
            return (
              <Checkbox
                {...fieldArgs.fieldProps}
                label="Enable Bitbucket Pipelines Explorer"
                onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                isChecked={this.props.configData.config.bitbucket.pipelines.explorerEnabled}
                isIndeterminate={this.getIsExplorerIndeterminate()}
              />
            );
          }}
        </CheckboxField>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            paddingLeft: '24px',
          }}
        >
          <CheckboxField
            name="pipelines-monitor-enabled"
            id="pipelines-monitor-enabled"
            value="bitbucket.pipelines.monitorEnabled"
          >
            {(fieldArgs: any) => {
              return (
                <Checkbox
                  {...fieldArgs.fieldProps}
                  label="Show notifications when new Bitbucket pipelines are created"
                  onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                  isDisabled={!this.props.configData.config.bitbucket.pipelines.explorerEnabled}
                  isChecked={this.props.configData.config.bitbucket.pipelines.monitorEnabled}
                />
              );
            }}
          </CheckboxField>
        </div>
        <div className="refreshInterval">
          <span>Refresh explorer every: </span>
          <input className='ac-inputField-inline' style={{ width: '60px' }} name="pipelines-refresh-interval"
            type="number" min="0"
            value={this.props.configData.config.bitbucket.pipelines.refreshInterval}
            onChange={(e: any) => this.handleNumberChange(e, "bitbucket.pipelines.refreshInterval")}
            disabled={!this.props.configData.config.bitbucket.pipelines.explorerEnabled} />
          <span> minutes (setting to 0 disables auto-refresh)</span>
        </div>


        <CheckboxField
          name="pipelines-filter-empty"
          id="pipelines-filter-empty"
          value="bitbucket.pipelines.hideEmpty"
        >
          {(fieldArgs: any) => {
            return (
              <Checkbox
                {...fieldArgs.fieldProps}
                label="Hide Bitbucket pipelines with no results"
                onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                isDisabled={!this.props.configData.config.bitbucket.pipelines.explorerEnabled}
                isChecked={this.props.configData.config.bitbucket.pipelines.hideEmpty}
              />
            );
          }}
        </CheckboxField>
        <MultiOptionList
          onConfigChange={this.props.onConfigChange}
          enabledConfig={'bitbucket.pipelines.hideFiltered'}
          optionsConfig={'bitbucket.pipelines.branchFilters'}
          enabledValue={this.props.configData.config.bitbucket.pipelines.hideFiltered}
          enabledDescription={'Show only Bitbucket pipelines matching filters'}
          promptString={'Add Filter'}
          options={this.props.configData.config.bitbucket.pipelines.branchFilters.slice()} />


      </div>
    );
  }
}

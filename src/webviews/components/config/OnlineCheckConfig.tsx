import * as React from "react";
import { IConfig } from "../../../config/model";
import MultiOptionList from "./MultiOptionList";

type changeObject = { [key: string]: any };

export default class OnlineCheckConfig extends React.Component<{ config: IConfig; onConfigChange: (changes: changeObject, removes?: string[]) => void; }, {}> {
  constructor(props: any) {
    super(props);
  }

  render() {
    return (
      <div>
        <MultiOptionList
          onConfigChange={this.props.onConfigChange}
          enabledConfig={'pingCustomSitesEnabled'}
          optionsConfig={'sitesToPing'}
          enabledValue={this.props.config.pingCustomSitesEnabled}
          enabledDescription={'Ping custom sites to check online status'}
          promptString={'Add site'}
          options={this.props.config.sitesToPing.slice()} />
      </div>
    );
  }
}

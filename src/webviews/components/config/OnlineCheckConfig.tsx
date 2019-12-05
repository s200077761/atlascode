import * as React from "react";
import { IConfig } from "../../../config/model";
import SitePingList from "./SitePingList";

type changeObject = { [key: string]: any };

export default class OnlineCheckConfig extends React.Component<{ config: IConfig; onConfigChange: (changes: changeObject, removes?: string[]) => void; }, {}> {
  constructor(props: any) {
    super(props);
  }

  render() {
    return (
      <div>
        <SitePingList
          onConfigChange={this.props.onConfigChange}
          optionsConfig={'onlineCheckerUrls'}
          enabledDescription={'Ping custom sites to check online status'}
          promptString={'Add site'}
          options={this.props.config.onlineCheckerUrls.slice()} />
      </div>
    );
  }
}

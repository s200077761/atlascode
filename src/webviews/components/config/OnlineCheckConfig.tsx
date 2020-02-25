import * as React from 'react';
import { IConfig } from '../../../config/model';
import URLPingList from './URLPingList';

type changeObject = { [key: string]: any };

export default class OnlineCheckConfig extends React.Component<
    { config: IConfig; onConfigChange: (changes: changeObject, removes?: string[]) => void },
    {}
> {
    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <div>
                <URLPingList
                    onConfigChange={this.props.onConfigChange}
                    optionsConfig={'onlineCheckerUrls'}
                    enabledDescription={'Ping custom URLs to check online status'}
                    promptString={'Add URL'}
                    options={this.props.config.onlineCheckerUrls.slice()}
                />
            </div>
        );
    }
}

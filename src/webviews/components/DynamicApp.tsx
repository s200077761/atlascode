import * as React from 'react';
import './App.css';
//import PullRequestPage from './PullRequestPage';
import * as Bitbucket from 'bitbucket';
//import ConfigView from './ConfigView';

declare var acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();

var componentUpdater = (data: any) => { };

window.addEventListener('message', handleMessage);
function handleMessage(event: any) {
    const message = event.data;
    switch (message.command) {
        case 'update-pr':
            vscode.setState({
                commits: message.commits,
                comments: message.comments,
                pr: message.pr
            });
            componentUpdater(vscode.getState());
            break;
        default:
            break;
    }
}

export interface PostMessageToVSCode {
    action: "alert";
    args?: any;
    msg?: string;
}

export interface State {
    pr?: Bitbucket.Schema.Pullrequest;
    commits: Bitbucket.Schema.Commit[];
    comments: Bitbucket.Schema.Comment[];
    postMessageToVSCode: (params: PostMessageToVSCode) => void;
}

class DynamicApp extends React.Component<{view:string|null}, any>  {
    constructor(props: any) {
        super(props);

        this.state = vscode.getState() || {
            commits: [],
            comments: [],
            postMessageToVSCode: this.postMessageToVSCode.bind(this)
        };
    }

    componentWillMount() {
        componentUpdater = (data) => { this.setState({ ...this.state, ...data }); };
    }

    postMessageToVSCode(m: PostMessageToVSCode) {
        switch (m.action) {
            case 'alert':
                vscode.postMessage({ command: 'alert', text: m.msg });
                break;
            default:
                break;
        }
    }

    public render() {
        console.log(this.props.view);
        switch(this.props.view) {
            case 'configView': {
                import(/* webpackChunkName: "configView" */ './ConfigView').then(ConfigView => this.setState({ ConfigView: ConfigView.default }));
                // const { ConfigView: ConfigView } = this.state;

                return(<div>Dynamic</div>);
            }
            default: {
                return (
                    <div>Default Case</div>
                );
            }
        }
    }
}

export default DynamicApp;


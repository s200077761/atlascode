import * as React from 'react';
import './App.css';
import PullRequestPage from './pullrequest/PullRequestPage';

declare var acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();

var componentUpdater = (data: any) => { };

window.addEventListener('message', handleMessage);
function handleMessage(event: any) {
    const message = event.data;
    switch (message.command) {
        case 'update-pr':
            vscode.setState({
                currentUser: message.currentUser,
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
    action: "alert" | "checkout" | "approve";
    args?: any;
}

export interface State {
    currentUser?: Bitbucket.Schema.User;
    pr?: Bitbucket.Schema.Pullrequest;
    commits: Bitbucket.Schema.Commit[];
    comments: Bitbucket.Schema.Comment[];
    postMessageToVSCode: (params: PostMessageToVSCode) => void;
}

class App extends React.Component<{}, State>  {
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

    postMessageToVSCode = (m: PostMessageToVSCode) => {
        switch (m.action) {
            case 'alert':
                vscode.postMessage({ command: 'alert', text: '🐛 on line ' });
                break;
            case 'approve':
                vscode.postMessage({ command: 'approve' });
                break;
            default:
                break;
        }
    }

    public render() {
        return (
            <div>
                <PullRequestPage {...this.state} />
            </div>
        );
    }
}

export default App;

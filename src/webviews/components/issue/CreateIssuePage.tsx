import * as React from 'react';
import { Action } from "../../../ipc/messaging";
import { WebviewComponent } from "../WebviewComponent";
import { CreateIssueData, CreateIssueScreen, ProjectList } from '../../../ipc/issueMessaging';
import JiraProjectSelect from '../JiraProjectSelect';
import { emptyWorkingProject, WorkingProject } from '../../../config/model';
import { FetchProjectsAction } from '../../../ipc/issueActions';

type Emit = FetchProjectsAction | Action;
type Accept = CreateIssueData | ProjectList;
const emptyState:CreateIssueData = {
    type:'',
    selectedProject:emptyWorkingProject,
    availableProjects:[],
    issueTypeScreens:new Map<string,CreateIssueScreen>()
};

export default class CreateIssuePage extends WebviewComponent<Emit, Accept, {},CreateIssueData> {
    private newProjects:WorkingProject[] = [];

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    onMessageReceived(e:Accept): void {
        switch (e.type) {
            case 'screenRefresh': {
                this.setState(e as CreateIssueData);
                break;
            }
            case 'projectList': {
                this.newProjects = (e as ProjectList).availableProjects;
                break;
            }
            default: {
                break;
            }
        }
    }

    handleProjectInput = (input:string):Promise<any> => {
        return new Promise(resolve => {
            this.newProjects = [];
            this.postMessage({action:'fetchProjects', query:input});
            let timer = setInterval(() => {
                if(this.newProjects.length > 0) {
                    clearInterval(timer);
                    resolve(this.newProjects);
                }
            }, 500);
        });
    }
    
    public render() {
        return (
            <div>
                <h3>Status</h3>
                <JiraProjectSelect selectedOption={this.state.selectedProject} initialOptions={this.state.availableProjects} onQuery={this.handleProjectInput}/>
        
            </div>
        );
    }
}

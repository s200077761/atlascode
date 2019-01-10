import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { ConfigData } from '../../../ipc/configMessaging';
import DropdownMenu, { DropdownItemGroup, DropdownItem } from '@atlaskit/dropdown-menu';
import { emptyProject } from '../../../jira/jiraModel';
import { InlineFlex } from '../styles';

type changeObject = {[key: string]:any};

export default class JiraExplorer extends React.Component<{ configData: ConfigData, onConfigChange: (changes:changeObject, removes?:string[]) => void }, {}> {
    constructor(props: any) {
        super(props);
    }

    onCheckboxChange = (e:any) => {
        const changes = Object.create(null);
        changes[e.target.value] = e.target.checked;

        if(this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    }

    onHandleSiteChange = (item:any) => {
        if(this.props.configData.sites){
            const site = this.props.configData.sites.find(site => site.id === item.target.parentNode.parentNode.dataset.siteId);
            if(site) {
                const changes = Object.create(null);
                const removes = [];

                removes.push('jira.workingProject');
                changes['jira.workingSite'] = site;

                if(this.props.onConfigChange) {
                    this.props.onConfigChange(changes,removes);
                }
            }
        }
    }

    onHandleProjectChange = (item:any) => {
        if(this.props.configData.projects){
            const project = this.props.configData.projects.find(project => project.id === item.target.parentNode.parentNode.dataset.projectId);
            if(project) {
                const changes = Object.create(null);
                changes['jira.workingProject'] = {id:project.id, name:project.name, key:project.key};

                if(this.props.onConfigChange) {
                    this.props.onConfigChange(changes);
                }
            } else if(item.target.parentNode.parentNode.dataset.projectId === 'empty') {
                const removes = ['jira.workingProject'];
                if(this.props.onConfigChange) {
                    this.props.onConfigChange([],removes);
                }
            }
        }
    }

    handleInputChange = (e: any, configKey: string) => {
        const changes = Object.create(null);
        changes[configKey] = e.target.value;

        if(this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    }

    getIsExplorerIndeterminate = ():boolean => {
        if(!this.props.configData.config.jira.explorer.enabled) {
            return false;
        }

        let count = 0;
        if(this.props.configData.config.jira.explorer.showAssignedIssues) {
            count++;
        }
        if(this.props.configData.config.jira.explorer.showOpenIssues) {
            count++;
        }

        return (count < 2);
    }

    checklabel = (label:string) => <span className='checkboxLabel'>{label}</span>;

    render() {
        let  siteSelect = <div></div>;
        const sites = this.props.configData.sites;

        if(sites && sites.length > 1) {
            const selectedSite = this.props.configData.config.jira.workingSite;
            let siteItems:any[] = [];
            sites.forEach(site => {
                if(this.props.configData.config.jira.workingSite.id !== site.id){
                    siteItems.push(
                        <DropdownItem
                            className='ak-dropdown-item'
                            id={site.name}
                            data-site-id={site.id}
                            onClick={this.onHandleSiteChange}>
                            {site.name}
                        </DropdownItem>
                    );
                }
            });

            siteSelect = <div className='labelAndSelect'><span>default site:</span> <DropdownMenu
                                    triggerType="button"
                                    trigger={selectedSite.name}
                                    triggerButtonProps={{className:'ak-button'}}
                                >
                                    <DropdownItemGroup>
                                    {siteItems}
                                    </DropdownItemGroup>
                                </DropdownMenu>
                            </div>;
        }

        let  projectSelect = <div></div>;
        const projects = this.props.configData.projects;

        if(projects && projects.length > 1) {
            let selectedProject = projects.find(project => project.id === this.props.configData.config.jira.workingProject.id);

            if(!selectedProject) {
                selectedProject = emptyProject;
                selectedProject.name = "not selected";
            }
            let projectItems:any[] = [<DropdownItem
                className='ak-dropdown-item'
                id='empty-project'
                data-project-id='empty'
                onClick={this.onHandleProjectChange}>
                not selected
            </DropdownItem>];
            projects.forEach(project => {
                if(this.props.configData.config.jira.workingProject.id !== project.id){
                    projectItems.push(
                        <DropdownItem
                            className='ak-dropdown-item'
                            id={project.name}
                            data-project-id={project.id}
                            onClick={this.onHandleProjectChange}>
                            {project.name}
                        </DropdownItem>
                    );
                }
            });

            projectSelect = <div className='labelAndSelect'><span>default project:</span> <DropdownMenu
                                    triggerType="button"
                                    trigger={selectedProject.name}
                                    triggerButtonProps={{className:'ak-button'}}
                                >
                                    <DropdownItemGroup>
                                    {projectItems}
                                    </DropdownItemGroup>
                                </DropdownMenu></div>;
        }

        return (
            <div>
                <div>
                    <Checkbox
                    value="jira.explorer.enabled"
                    label={this.checklabel("Enable Jira Issue Explorer")}
                    isChecked={this.props.configData.config.jira.explorer.enabled}
                    onChange={this.onCheckboxChange}
                    name="issue-explorer-enabled"
                    isIndeterminate={this.getIsExplorerIndeterminate()}
                    />
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            paddingLeft: '24px',
                        }}
                        >
                        <div className="refreshInterval">
                            <span>refresh every: </span>
                                <input style={{ width: '40px' }} name="jira-explorer-refresh-interval"
                                    type="number" min="0"
                                    value={this.props.configData.config.jira.explorer.refreshInterval}
                                    onChange={(e: any) => this.handleInputChange(e, "jira.explorer.refreshInterval")} />
                            <span> minutes (setting to 0 disables auto-refresh)</span>
                        </div>

                        <Checkbox
                            isChecked={this.props.configData.config.jira.explorer.showOpenIssues}
                            onChange={this.onCheckboxChange}
                            label={this.checklabel("Show My Open Issues")}
                            value="jira.explorer.showOpenIssues"
                            name="explorer-openissues"
                        />
                        <Checkbox
                            isChecked={this.props.configData.config.jira.explorer.showAssignedIssues}
                            onChange={this.onCheckboxChange}
                            label={this.checklabel("Show My Assigned Issues")}
                            value="jira.explorer.showAssignedIssues"
                            name="explorer-assigned-issues"
                        />
                    </div>
                </div>
                <hr/>
                <InlineFlex>
                    <div style={{ marginRight:'3em' }}>{siteSelect}</div>
                    {projectSelect}
                </InlineFlex>
            </div>
            
        );
    }
}

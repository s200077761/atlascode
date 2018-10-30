export const JiraWorkingProjectConfigurationKey = 'jira.workingProject';

export class Project {
  id: string;
  name: string;
  key: string;

  constructor(id: string, name: string, key: string) {
    this.id = id;
    this.name = name;
    this.key = key;
  }

  static isValid(project: JIRA.Schema.ProjectBean): boolean {
    if (project.id && project.name && project.key) {
      return true;
    }
    return false;
  }

  static readProject(project: JIRA.Schema.ProjectBean): Project {
    return new Project(project.id!, project.name!, project.key!);
  }
}

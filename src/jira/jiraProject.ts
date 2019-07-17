import { User, IssueType, emptyUser, emptyIssueType } from "./jiraCommon";
import { isIssueType } from "./jiraCommon";

export const emptyProjectVersion: ProjectVersion = {
  archived: false,
  description: "",
  id: "",
  name: "",
  overdue: false,
  project: "",
  projectId: -1,
  released: false,
  releaseDate: "",
  self: "",
  startDate: "",
  userReleaseDate: "",
  userStartDate: ""
};

export const emptyProjectComponent: ProjectComponent = {
  assignee: emptyUser,
  assigneeType: "UNASSIGNED",
  description: "",
  id: "",
  isAssigneeTypeValid: true,
  lead: emptyUser,
  leadAccountId: "",
  leadUserName: "",
  name: "",
  project: "",
  projectId: -1,
  realAssignee: emptyUser,
  realAssigneeType: "UNASSIGNED",
  self: ""
};

export const emptyProject: Project = {
  id: "",
  name: "",
  key: "",
  assigneeType: "UNASSIGNED",
  avatarUrls: {},
  components: [],
  description: "",
  favourite: false,
  issueTypes: [],
  lead: emptyUser,
  projectTypeKey: "",
  roles: {},
  self: "",
  simplified: false,
  url: "",
  versions: []
};

export interface ProjectVersion {
  archived: boolean;
  description: string;
  id: string;
  name: string;
  overdue: boolean;
  project: string;
  projectId: number;
  released: boolean;
  releaseDate: string;
  self: string;
  startDate: string;
  userReleaseDate: string;
  userStartDate: string;
}

export interface ProjectComponent {
  assignee: User;
  assigneeType:
  | "PROJECT_DEFAULT"
  | "COMPONENT_LEAD"
  | "PROJECT_LEAD"
  | "UNASSIGNED";
  description: string;
  id: string;
  isAssigneeTypeValid: boolean;
  lead: User;
  leadAccountId: string;
  leadUserName: string;
  name: string;
  project: string;
  projectId: number;
  realAssignee: User;
  realAssigneeType:
  | "PROJECT_DEFAULT"
  | "COMPONENT_LEAD"
  | "PROJECT_LEAD"
  | "UNASSIGNED";
  self: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  assigneeType: "PROJECT_LEAD" | "UNASSIGNED";
  avatarUrls: {
    [k: string]: string;
  };
  components: ProjectComponent[];
  description: string;
  favourite: boolean;
  issueTypes: IssueType[];
  lead: User;
  projectTypeKey: string;
  roles: {
    [k: string]: string;
  };
  self: string;
  simplified: boolean;
  url: string;
  versions: ProjectVersion[];
}

export function isProjectComponent(a: any): a is ProjectComponent {
  return (
    a &&
    (<ProjectComponent>a).assigneeType !== undefined &&
    (<ProjectComponent>a).id !== undefined &&
    (<ProjectComponent>a).isAssigneeTypeValid !== undefined
  );
}

export function isProjectVersion(a: any): a is ProjectVersion {
  return (
    a &&
    (<ProjectVersion>a).id !== undefined &&
    (<ProjectVersion>a).name !== undefined &&
    (<ProjectVersion>a).archived !== undefined
  );
}

export function isProject(a: any): a is Project {
  return (
    a &&
    (<Project>a).key !== undefined &&
    (<Project>a).name !== undefined &&
    (<Project>a).id !== undefined &&
    (<Project>a).projectTypeKey !== undefined
  );
}

export function projectFromJsonObject(projectJson: any): Project {
  let components: ProjectComponent[] = [];
  if (projectJson.components) {
    components = projectJson.components.map((compJson: any) => {
      if (isProjectComponent(compJson)) {
        return compJson;
      }

      return emptyProjectComponent;
    });
  }

  let issueTypes: IssueType[] = [];
  if (projectJson.issueTypes) {
    components = projectJson.issueTypes.map((typeJson: any) => {
      if (isIssueType(typeJson)) {
        return typeJson;
      }

      return emptyIssueType;
    });
  }

  let versions: ProjectVersion[] = [];
  if (projectJson.versions) {
    versions = projectJson.versions.map((verJson: any) => {
      if (isProjectVersion(verJson)) {
        return verJson;
      }

      return emptyProjectVersion;
    });
  }

  let avatarUrls: { [k: string]: string } = {};
  if (projectJson.avatarUrls) {
    avatarUrls = projectJson.avatarUrls;
  }

  let roles: { [k: string]: string } = {};
  if (projectJson.roles) {
    roles = projectJson.roles;
  }

  return {
    id: projectJson.id,
    name: projectJson.name,
    key: projectJson.key,
    assigneeType: projectJson.assigneeType,
    avatarUrls: avatarUrls,
    components: components,
    description: projectJson.description,
    favourite: projectJson.favourite,
    issueTypes: issueTypes,
    lead: projectJson.lead,
    projectTypeKey: projectJson.projectTypeKey,
    roles: roles,
    self: projectJson.self,
    simplified: projectJson.simplified,
    url: projectJson.url,
    versions: versions
  };
}

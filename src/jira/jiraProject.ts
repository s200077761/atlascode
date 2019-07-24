import { User, emptyUser } from "./jiraCommon";

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
  avatarUrls: {},
  self: "",
  simplified: false,
  projectTypeKey: "software",
  style: "classic",
  isPrivate: false,
  uuid: undefined
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
  avatarUrls: {
    [k: string]: string;
  };
  projectTypeKey: "ops" | "software" | "service_desk" | "business";
  self: string;
  simplified: boolean;
  style: "CLASSIC" | "NEXTGEN" | "classic" | "next-gen";
  isPrivate: boolean;
  uuid: string | undefined; // defined for next-gen
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
  let avatarUrls: { [k: string]: string } = {};
  if (projectJson.avatarUrls) {
    avatarUrls = projectJson.avatarUrls;
  }

  return {
    id: projectJson.id,
    name: projectJson.name,
    key: projectJson.key,
    avatarUrls: avatarUrls,
    projectTypeKey: projectJson.projectTypeKey,
    self: projectJson.self,
    simplified: projectJson.simplified,
    style: projectJson.style,
    isPrivate: projectJson.isPrivate,
    uuid: projectJson.uuid
  };
}

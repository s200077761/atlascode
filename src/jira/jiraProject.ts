export const emptyProject: Project = {
  id: "",
  name: "",
  key: "",
  avatarUrls: {},
  projectTypeKey: "",
  self: "",
  simplified: false,
  style: "",
  isPrivate: false
};

export interface Project {
  id: string;
  name: string;
  key: string;
  avatarUrls: {
    [k: string]: string;
  };
  projectTypeKey: string;
  self: string;
  simplified: boolean;
  style: string;
  isPrivate: boolean;
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
  };
}

// Types for digest data

export interface TaskDigestItem {
  id: string;
  title: string;
  dueDate: Date | null;
  status: string;
  priority: string;
  project: {
    id: string;
    name: string;
  };
  assignee: {
    id: string;
    name: string | null;
  } | null;
}

export interface PermitDigestItem {
  id: string;
  name: string;
  permitNumber: string | null;
  deadline: Date;
  status: string;
  project: {
    id: string;
    name: string;
  };
}

export interface GroupedTasks {
  [projectId: string]: {
    projectName: string;
    projectId: string;
    tasks: TaskDigestItem[];
  };
}

export interface GroupedPermits {
  [projectId: string]: {
    projectName: string;
    projectId: string;
    permits: PermitDigestItem[];
  };
}

export interface DigestData {
  tasks: GroupedTasks;
  permits: GroupedPermits;
  hasItems: boolean;
}

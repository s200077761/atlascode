

export const epicsDisabled: EpicFieldInfo = {
    epicLink: { name: "", id: "", cfid: 0 },
    epicName: { name: "", id: "", cfid: 0 },
    epicsEnabled: false
};



export interface CFIdName {
    id: string;
    name: string;
    cfid: number;
}

export interface EpicFieldInfo {
    epicName: CFIdName;
    epicLink: CFIdName;
    epicsEnabled: boolean;
}



export interface JiraSettings {

}





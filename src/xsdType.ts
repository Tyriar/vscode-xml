export class XsdType {
  public xsdType: string;
  public xsdTypeName: string;
  public xsdAttributes: any[] = [];
  public xsdChildrenMode: string = '';
  public xsdChildren: any[] = [];

  public text: string;
  public displayText: string;
  public description: string;
  public type: string = 'tag';
  public leftLabel: string;
  public rightLabel: string = 'Tag';

  public constructor(node, typeName) {
    this.xsdTypeName = typeName ? typeName : (node.$ ? node.$.name : null);
    // TODO: Fetch documentation
    this.description = ''; //this.getDocumentation node;
  }
}

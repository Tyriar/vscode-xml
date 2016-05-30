import * as xml2js from 'xml2js';
import {XsdType} from './xsdType';
import * as uuid from 'uuid';

export class XsdParser {
  public types: any = {};
  public roots: any = {};
  public attributeGroups: any = {};

  public parseFromString(xmlText: string) {
    let options = {
      // Strip namespace prefix
      tagNameProcessors: [xml2js.processors.stripPrefix],
      preserveChildrenOrder: true,
      explicitChildren: true
    };
    xml2js.parseString(xmlText, options, (err, result) => {
      if (err) {
        console.error(err);
      }
      this.parse(result);
    });
  }

  public parse(xml) {
    let schema = xml['schema'];
    if (!schema) {
      return;
    }

    let schemaFound = false;

    for (let property in schema.$) {
      if (schema.$[property] === "http://www.w3.org/2001/XMLSchema") {
        schemaFound = true;
      }
    }

    if (!schemaFound) {
      return;
    }

    // Process all ComplexTypes and SimpleTypes
    schema.$$.forEach(this.parseType.bind(this));

    // Process the root node (Element type).
    schema.element.forEach(this.parseRoot.bind(this));

    // Copy root types into types since they could be used too.
    for (let rootName in this.roots) {
      this.types[rootName] = this.roots[rootName];
    }

    // Process all AttributeGroup (not regular types).
    if (xml.attributeGroup) {
      xml.attributeGroup.forEach(this.parseAttributeGroup.bind(this));
    }

    // Post parse the nodes and resolve links.
    this.postParsing();
  }

  public parseRoot(node) {
    let rootElement = this.parseElement(node);
    let rootTagName = rootElement.tagName;
    let rootType = this.types[rootElement.xsdTypeName]

    let root = new XsdType(null, rootElement.xsdTypeName);
    root.description = rootElement.description ? rootElement.description : rootType.description;
    root.text = rootTagName;
    root.displayText = rootTagName;
    root.type = 'class';
    root.rightLabel = 'Root';
    root.xsdType = 'complex';

    root.xsdAttributes = rootType.xsdAttributes
    root.xsdChildrenMode = rootType.xsdChildrenMode
    root.xsdChildren = rootType.xsdChildren

    this.roots[rootTagName] = root
    return root
  }

  public parseElement(node) {
    let child = {
      tagName: node.$.name ? node.$.name : node.$.ref,
      xsdTypeName: node.$.type ? node.$.type : node.$.ref,
      minOccurs: node.$.minOccurs ? node.$.minOccurs : 0,
      maxOccurs: node.$.maxOccurs ? node.$.maxOccurs : 'unbounded',
      // TODO: Fill dcumentation
      description: '' //this.@getDocumentation node
    };

    // If the element type is defined inside.
    if (!child.xsdTypeName && node.$$) {
      child.xsdTypeName = this.parseAnonElements(node);
    }

    return child;
  }

  public parseAnonElements(node) {
    // Create a randome type name and parse the child.
    // Iterate to skip "annotation", etc. It should ignore all except one.
    let randomName = uuid.v4()
    node.$$.forEach((childNode) => {
      this.parseType(childNode, randomName);
    })
    return randomName;
  }

  public parseType(node, typeName?) {
    let type = new XsdType(node, typeName);
    if (!type.xsdTypeName) {
      return null;
    }

    let nodeName = node['#name'];
    switch (nodeName) {
      case 'simpleType':
        return this.parseSimpleType(node, type);
      case 'complexType':
        return this.parseComplexType(node, type);
      case 'group':
        return this.parseGroupType(node, type);
    }
  }

  public parseSimpleType(node, type: XsdType) {
    type.xsdType = 'simple'

    let childrenNode;
    if (node.restriction && node.restriction[0].enumeration) {
      type.xsdChildrenMode = 'restriction';
      childrenNode = node.restriction[0];
      type.leftLabel = childrenNode.$.base;
    } else if (node.union) {
      type.xsdChildrenMode = 'union'
      type.leftLabel = node.union[0].$.memberTypes
    }

    if (childrenNode) {
      let group = {
        childType: 'choice',
        description: '',
        minOccurs: 0,
        maxOccurs: 'unbounded',
        elements: []
      };
      type.xsdChildren.push(group);
      childrenNode.enumeration.forEach((val) => {
        group.elements.push({
          tagName: val.$.value,
          xsdTypeName: null,
          description: '',
          minOccurs: 0,
          maxOccurs: 1
        });
      });
    }

    this.types[type.xsdTypeName] = type;
    return type;
  }

  public parseComplexType(node, type) {
    type.xsdType = 'complex';

    // Get the node that contains the children.
    let childrenNode = null;

    if (node.sequence) {
      type.xsdChildrenMode = 'sequence';
      childrenNode = node.sequence[0];
    } else if (node.choice) {
      type.xsdChildrenMode = 'choice';
      childrenNode = node.choice[0];
    } else if (node.all) {
      type.xsdChildrenMode = 'all';
      childrenNode = node.all[0];
    } else if (node.complexContent && node.complexContent[0].extension) {
      type.xsdChildrenMode = 'extension';
      type.xsdChildren = node.complexContent[0].extension[0];
    } else if (node.group) {
      type.xsdChildrenMode = 'group';
      type.xsdChildren = node.group[0];
    }

    if (childrenNode) {
      type.xsdChildren = this.parseChildrenGroups(childrenNode.element, 'element')
        .concat(this.parseChildrenGroups(childrenNode.choice, 'choice'))
        .concat(this.parseChildrenGroups(childrenNode.sequence, 'sequence'))
        .concat(this.parseChildrenGroups(childrenNode.group, 'group'));
    }

    if (node.attribute) {
      let results = [];
      node.$$.forEach((n) => {
        results.push(this.parseAttribute(n));
      })
      type.xsdAttributes = results.filter(Boolean);
    }

    this.types[type.xsdTypeName] = type;
    return type;
  }

  private parseGroupType(node, type) {
    return this.parseComplexType(node, type);
  }

  // Parse the group of children nodes.
  private parseChildrenGroups(groupNodes, mode) {
    if (!groupNodes) {
      return [];
    }

    // For each element/sequence/choice node, create a group object.
    let groups = []
    groupNodes.forEach((node) => {
      let group = {
        childType: mode,
        ref: node.$ && node.$.ref ? node.$.ref : null,
        // TODO: getDocumentation
        description: '', //this.getDocumentation(node),
        minOccurs: node.$ && node.$.minOccurs ? node.$.minOccurs : 0,
        maxOccurs: node.$ && node.$.maxOccurs ? node.$.maxOccurs : 'unbounded'
      };

      if (mode === 'element') {
        group['elements'] = [].concat(this.parseElement(node));
      } else {
        group['elements'] = [];
        if (node.element) {
          node.element.forEach((childNode) => {
            group['elements'].push(this.parseElement(childNode));
          });
        }
      }
      groups.push(group);
    });
    return groups;
  }

  private parseAttribute(node): any {
    let nodeName = node["#name"];
    if (nodeName === "attribute" && node.$.use !== "prohibited") {
      let attr = {
        name: node.$.name,
        type: node.$.type,
        // TODO: getDoc.
        description: '', //this.getDocumentation(node),
        fixed: node.$.fixed,
        use: node.$.use,
        default: node.$.default
      };

      // If the attribute type is defined inside.
      if (!node.$.type && node.$$) {
        attr.type = this.parseAnonElements(node);
      }
      return attr;
    } else if (nodeName === "attributeGroup") {
      return {ref: node.$.ref}
    }
    return null;
  }

  // Parse a AttributeGroup node.
  private parseAttributeGroup(node) {
    let name = node.$.name;
    this.attributeGroups[name] = [];
    node.$$.forEach((xattr) => {
      this.attributeGroups[name].push(this.parseAttribute(xattr).bind(this));
    })
  }

  private postParsing() {
    // TODO: Implement postParsing
/*
postParsing: ->
  # Post process all nodes
  for name, type of @types
    # If the children type is extension, resolve the link.
    if type.xsdChildrenMode == 'extension'
      extenType = type.xsdChildren
      extenAttr = (@parseAttribute n for n in (extenType.$$ or []))
        .filter Boolean

      # Copy fields from base
      linkType = @types[extenType.$.base]
      type.xsdTypeName = linkType.xsdTypeName
      type.xsdChildrenMode = linkType.xsdChildrenMode
      type.xsdChildren = linkType.xsdChildren
      type.xsdAttributes = extenAttr.concat linkType.xsdAttributes
      type.description ?= linkType.description
      type.type = linkType.type
      type.rightLabel = linkType.rightLabel

    # If it's a group, resolve the link
    else if type.xsdChildrenMode == 'group'
      groupType = type.xsdChildren

      # Copy the children
      linkType = @types[groupType.$.ref]
      type.xsdChildren = linkType.xsdChildren
      type.xsdChildrenMode = linkType.xsdChildrenMode

    # If it's an union, merge the single types
    else if type.xsdChildrenMode is 'union'
      unionTypes = type.leftLabel.split(' ')
      type.xsdChildrenMode = 'restriction'
      for t in unionTypes
        memberType = @types[t]
        type.xsdChildren.push memberType.xsdChildren[0] if memberType

    # At the moment, I think it only makes sense if it replaces all the
    # elements. Consider a group that contains a sequence of choice elements.
    # We don't support sequence->sequence(from group)->choide->elements.
    for group in type.xsdChildren
      if group.childType is 'group'
        linkType = @types[group.ref]
        type.xsdChildren = linkType.xsdChildren
        break

    # Add the attributes from the group attributes
    groups = (attr.ref for attr in type.xsdAttributes when attr.ref)
    attributes = []
    for attr in type.xsdAttributes
      if attr.ref
        attributes = attributes.concat @attributeGroups[attr.ref]
      else
        attributes.push attr
    type.xsdAttributes = attributes
*/
  }
}

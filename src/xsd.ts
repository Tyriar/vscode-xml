import fs = require('fs');
import http = require('http');
import https = require('https');
import path = require('path');
import {Uri} from 'vscode';
import {XsdParser} from './xsdParser';

export class Xsd {
  private xsdParser = new XsdParser();
  private types: any = {};

  public load(xmlUri: Uri, xsdUri: Uri): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (xsdUri.scheme) {
        let protocol = xsdUri.scheme === 'http' ? http : https;
        protocol.get(xsdUri.toString(), (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            resolve(this.parseFromString(body));
          });
        }).on('error', (err) => {
          console.error(err);
          resolve(false);
        });
      } else {
        // Local
        let baseDir: string = path.dirname(xmlUri.fsPath);
        // TODO: Handle absolute paths
        fs.readFile(path.join(baseDir, xsdUri.fsPath), (err, data) => {
          if (err) {
            console.error(err);
            resolve(false);
          }

          resolve(this.parseFromString(data));
        });
      }
    });
  }

  private parseFromString(data): Promise<boolean> {
    this.types = this.xsdParser.types;
    this.xsdParser.parseFromString(data);
    return Promise.resolve(true);
  }

  // Called when suggestion requested. Get all the possible node children.
  public getChildren(xpath) {
    // If there is no path, we need a root node first!
    if (xpath.length === 0) {
      let result = [];
      for (let name in this.xsdParser.roots) {
        result.push(this.xsdParser.roots[name]);
      }
      return result;
    }

    // Get the XSD type name from the tag name.
    let type = this.findTypeFromXPath(xpath)
    if (!type || type.xsdType !== 'complex') {
      return [];
    }

    // Create list of suggestions from childrens
    // TODO: Represent groups in autocompletion

    let suggestions = [];
    type.xsdChildren.forEach((group) => {
      group.elements.forEach((el) => {
        suggestions.push(this.createChildSuggestion(el));
      });
    });

    // Remove undefined elements (e.g.: non-supported yet types).
    return suggestions.filter((n) => n !== undefined);
  }

  // Search the type from the XPath
  private findTypeFromXPath(xpath) {
    let type = this.xsdParser.roots[xpath[0]];
    xpath.shift() // Remove root node.

    while (xpath && xpath.length > 0 && type) {
      let nextTag = xpath.shift();
      let nextTypeName = this.findTypeFromTag(nextTag, type);
      type = this.types[nextTypeName];
    }

    return type;
  }

  // Search for the XSD type name by using the tag name.
  private findTypeFromTag(tagName, node): string {
    for (let i = 0; i < node.xsdChildren.length; i++) {
      let group = node.xsdChildren[i];
      for (let j = 0; j < group.elements.length; j++) {
        let el = group.elements[j];
        if (el.tagName === tagName) {
          return el.xsdTypeName;
        }
      };
    };
    return undefined;
  }

  // Create a suggestion object from a child object.
  private createChildSuggestion(child) {
    // The suggestion is a merge between the general type info and the
    // specific information from the child object.
    let childType = this.types[child.xsdTypeName]

    // Create the snippet
    let snippet = child.tagName;

    // Add the must-be attributes
    let snippetId = 1;
    if (childType && childType.xsdAttributes) {
      childType.xsdAttributes.forEach((attr) => {
        if (attr.use === 'required') {
          snippet += ` ${attr.name}=\"`;
          snippet += `"${snippetId++}:${(attr.fixed ? attr.fixed : attr.default) ? attr.default : ''}}\"`;
        }
      });
    }
    snippet += ">";

    // Add the closing tag if so
    let closingConfig = true; //atom.config.get 'autocomplete-xml.addClosingTag';
    if (closingConfig) {
      snippet += `${snippetId++}</` + child.tagName + '>';
    }

    // Create the suggestion
    let suggestion = {
      snippet: snippet,
      displayText: child.tagName,
      description: child.description ? child.description : childType && childType.description ? childType.description : '',
      type: 'tag',
      rightLabel: 'Tag',
      leftLabel: ''
    }

    if (childType) {
      suggestion.leftLabel = childType.leftLabel;
    } else {
      suggestion.leftLabel = child.xsdTypeName;
    }

    return suggestion;
  }

  // Called when suggestion requested for attributes.
  public getAttributes(xpath) {
    // Get the XSD type name from the tag name.
    let type = this.findTypeFromXPath(xpath);
    if (!type) {
      return [];
    }

    // Create list of suggestions from attributes
    let suggestions = []
    type.xsdAttributes.forEach((attr) => {
      suggestions.push({
        text: attr.description,
        displayText: attr.name,
        type: 'attribute',
        rightLabel: 'Attribute'
      });
    });
    return suggestions;
  }

  public getAttributeValues(xpath, attrName) {
    // Get the XSD type name of the tag name
    let type = this.findTypeFromXPath(xpath);
    if (!type) {
      return []
    }

    // Get the attribute type

    let attributes = type.xsdAttributes.filter((attr) => {
      return attr.name === attrName
    });
    if (attributes.length === 0) {
      return [];
    }
    let attrType = this.types[attributes[0].type];
    if (!attrType) {
      return [];
    }

    // Create list of suggestions from childrens
    // TODO: Represent groups in autocompletion
    let suggestions = []
    attrType.xsdChildren.forEach((group) => {
      group.elements.forEach((el) => {
        suggestions.push({
          text: el.tagName,
          displayText: el.tagName,
          type: 'value',
          rightLabel: 'Value'
        });
      });
    });

    // Remove undefined elements (e.g.: non-supported yet types).
    return suggestions.filter((n) => n !== undefined);
  }
}

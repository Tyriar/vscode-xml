import fs = require('fs');
import path = require('path');
import {Uri} from 'vscode';
import {XsdParser} from './xsdParser';

export class Xsd {
    private xsdParser = new XsdParser();
    private types: any = {};

    public load(xmlUri: Uri, xsdUri: Uri): Promise<boolean> {
        if (xsdUri.scheme) {
            // TODO: Download
            return Promise.resolve(false);
        } else {
            // Local
            let baseDir: string = path.dirname(xmlUri.fsPath);
            // TODO: Handle absolute paths
            fs.readFile(path.join(baseDir, xsdUri.fsPath), (err, data) => {
                if (err) {
                    console.error(err);
                    return Promise.resolve(false);
                }

                return this.parseFromString(data);
            });
        }
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
}
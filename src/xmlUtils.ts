import {Position, Range, TextDocument} from 'vscode';

// This will catch:
// * Start tags: <tagName
// * End tags: </tagName
// * Auto close tags: />
let startTagPattern = '<\s*[\\.\\-:_a-zA-Z0-9]+';
let endTagPattern = '<\\/\s*[\\.\\-:_a-zA-Z0-9]+';
let autoClosePattern = '\\/>';
let startCommentPattern = '\s*<!--';
let endCommentPattern = '\s*-->';
let fullPattern = new RegExp("(" +
  startTagPattern + "|" + endTagPattern + "|" + autoClosePattern + "|" +
  startCommentPattern + "|" + endCommentPattern + ")", "g");


// Get the full XPath to the current tag.
export function getXPath(document: TextDocument, position: Position): string[] {
  // For every row, checks if it's an open, close, or autoopenclose tag and
  // update a list of all the open tags.
  //{row, column} = bufferPosition
  let xpath: string[] = [];
  let skipList: string[] = [];
  let waitingStartTag = false;
  let waitingStartComment = false;

  // For the first line read, excluding the word the cursor is over
  let wordRange = document.getWordRangeAtPosition(position);
  let wordStart = wordRange ? wordRange.start : position;
  let line = document.getText(new Range(position.line, 0, position.line, wordStart.character));
  let row = position.line;

  while (row >= 0) { //and (!maxDepth or xpath.length < maxDepth)
    row--;

    // Apply the regex expression, read from right to left.
    let matches = line.match(fullPattern);
    if (matches) {
      matches.reverse();

      for (let i = 0; i < matches.length; i++) {
        let match = matches[i];
        let tagName;

        // Start comment
        if (match === "<!--") {
          waitingStartComment = false;
        }
        // End comment
        else if (match === "-->") {
          waitingStartComment = true;
        }
        // Omit comment content
        else if (waitingStartComment) {
          continue;
        }
        // Auto tag close
        else if (match === "/>") {
          waitingStartTag = true;
        }
        // End tag
        else if (match[0] === "<" && match[1] === "/") {
          skipList.push(match.slice(2));
        }
        // This should be a start tag
        else if (match[0] === "<" && waitingStartTag) {
          waitingStartTag = false;
        } else if (match[0] == "<") {
          tagName = match.slice(1);
          // Omit XML definition.
          if (tagName === "?xml") {
            continue;
          }

          let idx = skipList.lastIndexOf(tagName);
          if (idx != -1) {
            skipList.splice(idx, 1);
          } else {
            xpath.push(tagName);
          }
        }
      };
    }

    // Get next line
    if (row >= 0) {
      line = document.lineAt(row).text;
    }
  }

  return xpath.reverse();
}

import * as assert from 'assert';
import * as testUtils from './testUtils';
import * as xmlUtils from '../src/xmlUtils';
import * as vscode from 'vscode';

suite("xmlUtils Tests", () => {
  test("getXPath - Simple tags on a single line works as expected", (done) => {
    let fixturePath = testUtils.buildFixture(`<a> <b> </b> </a>`);

    vscode.workspace.openTextDocument(fixturePath).then((document: vscode.TextDocument) => {
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 0)), []);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 1)), []);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 2)), []);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 3)), ['a']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 4)), ['a']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 5)), ['a']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 6)), ['a']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 7)), ['a', 'b']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 8)), ['a', 'b']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 9)), ['a', 'b']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 10)), ['a', 'b']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 11)), ['a', 'b']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 12)), ['a']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 13)), ['a']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 14)), ['a']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 15)), ['a']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 16)), ['a']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 17)), []);
      done();
    });
  });

  test("getXPath - Simple tags over multiple lines work as expected", (done) => {
    let fixturePath = testUtils.buildFixture(`<a>
<b>
<c>
</c>
</b>
</a>`);

    vscode.workspace.openTextDocument(fixturePath).then((document: vscode.TextDocument) => {
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 0)), []);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 1)), []);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 2)), []);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(0, 3)), ['a']);

      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(1, 0)), ['a']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(1, 1)), ['a']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(1, 2)), ['a']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(1, 3)), ['a', 'b']);

      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(2, 0)), ['a', 'b']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(2, 1)), ['a', 'b']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(2, 2)), ['a', 'b']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(2, 3)), ['a', 'b', 'c']);

      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(3, 0)), ['a', 'b', 'c']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(3, 1)), ['a', 'b', 'c']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(3, 2)), ['a', 'b', 'c']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(3, 3)), ['a', 'b', 'c']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(3, 4)), ['a', 'b']);

      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(4, 0)), ['a', 'b']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(4, 1)), ['a', 'b']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(4, 2)), ['a', 'b']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(4, 3)), ['a', 'b']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(4, 4)), ['a']);

      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(5, 0)), ['a']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(5, 1)), ['a']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(5, 2)), ['a']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(5, 3)), ['a']);
      assert.deepEqual(xmlUtils.getXPath(document, new vscode.Position(5, 4)), []);
      done();
    });
  });
});

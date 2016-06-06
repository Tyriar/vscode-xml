import fs = require('fs');
import path = require('path');
import uuid = require('uuid');

export function buildFixture(fileContents: string): string {
  let fixtureDir: string = path.join(__dirname, 'fixtures');
  let fixturePath: string = path.join(fixtureDir, uuid.v4());
  try {
    fs.mkdirSync(fixtureDir);
  } catch (ex) {
    // Nom nom nom
  }
  fs.writeFileSync(fixturePath, fileContents);
  return fixturePath;
}

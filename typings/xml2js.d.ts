interface Processors {
  stripPrefix: any;
}

declare module 'xml2js' {
  export function parseString(string: string, callback: (err, result) => void);
  export function parseString(string: string, options: Object, callback: (err, result) => void);

  export var processors: Processors;
}

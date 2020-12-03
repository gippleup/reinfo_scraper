import fs from 'fs';
import path from 'path';
import xml2js from 'xml2js';

export const saveFile = (filepath: string, data: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filepath, data, (err) => {
      if (err) reject(err);
      console.log(`saved ${filepath}`);
      resolve();
    })
  })
}

export const readDir = (dirpath: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    fs.readdir(path.resolve(dirpath), (err, files) => {
      if (err) reject(err);
      resolve(files);
    })
  })
}

export const readFile = (filepath: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(filepath), (err, buffer) => {
      if (err) reject(err);
      resolve(buffer);
    })
  })
}

export const flattenObject = (obj: Object) => {
  const flattened: {[index: string]: any} = {};
  if (Array.isArray(obj) && obj.length === 1) {
    return obj[0];
  } else {
    const entries = Object.entries(obj);
    entries.forEach(([key, value]) => {
      if (typeof value === "object") {
        if (Array.isArray(value) && value.length === 1) {
          if (typeof value[0] === "object") {
            flattened[key] = flattenObject(value[0])
          } else {
            flattened[key] = value[0];
          }
        } else {
          flattened[key] = flattenObject(value);
        }
      } else {
        flattened[key] = value;
      }
    })
    return flattened;
  }
}


export const parseXml = (xml: string | Buffer): Promise<Object> => {
  const parser = new xml2js.Parser();
  return new Promise((resolve, reject) => {
    parser.parseString(xml, (err: any, result: any) => {
      if (err) reject(err);
      const flattened = flattenObject(result);
      resolve(flattened);
    })
  })
}
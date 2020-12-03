import path from 'path';
import {
  readDir,
  readFile,
  saveFile,
} from './utils';
import cheerio from 'cheerio';

const htmlDir = path.resolve(__dirname, "./assets/svg")

readDir(htmlDir).then((filename) => {
  filename.forEach((name) => {
    readFile(`${htmlDir}/${name}`)
    .then((buffer) => buffer.toString())
    .then((html) => {
      const $ = cheerio.load(html);
      const result: {[index: string]: any} = {};
      const paths = $("path");
      const tags = $("text");
      
      paths.each((i, path) => {
        if (path.attribs.id === undefined) return null;
        if (path.attribs.id.match(/^CD/g)) {
          const d = path.attribs.d || null;
          const code = path.attribs.id.match(/\d+/g);
          if (!code) return;
          if (result[code[0]] === undefined) result[code[0]] = {};
          result[code[0]].d = d;
        }
      })

      tags.each((i, tag) => {
        if (tag.children.length) {
          tag.children.forEach((child) => {
            const {id, x, y} = tag.attribs;
            const name = child.data;
            const code = id.match(/\d+/g);
            if (!code) return;
            if (result[code[0]] === undefined) result[code[0]] = {};
            result[code[0]].tag = {
              name,
              x,
              y,
            }
          })
        }
      })

      console.log(result);
      const filepath = path.resolve(__dirname, `./assets/json/${name.replace(".html", "")}.json`)
      saveFile(filepath, JSON.stringify(result));
    })
  })
})

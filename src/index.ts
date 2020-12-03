import fs from 'fs';
import path from 'path';
import getRealEstateDeal, { RealEstateTypes } from './getRealEstateDeal';
import {
  flattenObject,
  readFile,
  parseXml,
  saveFile
} from './utils';
const geocode = require("./assets/geocode_5code.json") as ShortGeocodeType;

type ShortGeocodeType = {[index: string]: number}

type GeocodeJsonType = {
  "대분류": number,
  "시도": string,
  "중분류": number,
  "시군구": string,
  "소분류": number,
  "읍면동": string,
  "영문 표기": string,
  "한자 표기": string,
}

type RealEstateXml = {
  response: {
    header: {
       resultCode: string,
       resultMsg: string
    },
    body: {
       items: any[],
       numOfRows: string,
       pageNo: string,
       totalCount: string
    }
  }
}

const saveGeocodes = () => {
  fs.readFile("assets/geocode.json", (err, buffer) => {
    if(err) throw err;
    const json: GeocodeJsonType[] = JSON.parse(buffer.toString());
    const 대분류: {[index: string]: number} = {}
    json.forEach((entry) => {
      const key = `${entry.시도} ${entry.시군구}`;
      const value = entry.중분류;
      if (value) {
        대분류[key] = value;
      }
    })
    fs.writeFile("geocode_5code.json", JSON.stringify(대분류), (err) => {
      if (err) throw err;
    })
  })
}

const enpoints: RealEstateTypes[] = ["commercial", "land", "offi", "dasedae", "apart", "dandok"]

const BigGeocode = {
  seoul: 11,
  busan: 21,
  daegu: 22,
  incheon: 23,
  gwangju: 24,
  daejeon: 25,
  ulsan: 26,
  sejong: 29,
  gyeongi: 31,
  gangwon: 32,
  chungcheongbukdo: 33,
  chungcheongnamdo: 34,
  jeollabukdo: 35,
  jeollanamdo: 36,
  kyeongsangbukdo: 37,
  kyeongsangnamdo: 38,
  jeju: 39,
} as const;

type WholeDataType = {
  meta?: {
    ymd: number;
    targetArea: string;
  }
  data?: {
    [index: number]: {
      [index: string]: {

      }
    }
  }
}

const codeMatchTargetArea = (code: number, targetArea: keyof typeof BigGeocode) => {
  const first2digit = code.toString().slice(0, 2);
  const bigGeocode = BigGeocode[targetArea].toString();
  return first2digit === bigGeocode;
}

const getXmlDataForYmd = async (ymd: number, targetArea: keyof typeof BigGeocode) => {
  return new Promise(async (resolve, reject) => {
    const wholeData: WholeDataType = {};
    const metaTasks = Object.entries(geocode).map(([geoname, code]) => {
      if (!codeMatchTargetArea(code, targetArea)) return;
      const tasks = enpoints.map(async (type: RealEstateTypes) => {
        const xml = await getRealEstateDeal(type, code, ymd);
        if (!xml) return;
        const parsedXml = await parseXml(xml) as RealEstateXml;
        if (!parsedXml) return;
        if (parsedXml.response.header.resultCode !== "00") {
          if (parsedXml.response.header.resultCode === "99") return;
          return reject(parsedXml.response.header.resultMsg);
        }
  
        const items = parsedXml.response.body.items || [];
  
        if (wholeData.meta === undefined) wholeData.meta = { targetArea, ymd };
        if (wholeData.data === undefined) wholeData.data = {};
        if (wholeData.data[code] === undefined) wholeData.data[code] = {};
        if (wholeData.data[code][type] === undefined) wholeData.data[code][type] = {};
        wholeData.data[code][type] = items;
        // if (wholeData[ymd][code][type][geoname] === undefined) wholeData[ymd][code][type][geoname] = {};
        // wholeData[ymd][code][type][geoname] = items;
        // saveFile(path.resolve(__dirname, `./xml/${geoname}_${type}_${ymd}`), xml)
      })
      return Promise.all(tasks);
    })
    await Promise.all(metaTasks);
    // saveFile(path.resolve(__dirname, `./json/wholeData.json`), JSON.stringify(wholeData))
    resolve(wholeData);
  })
}

const getExistingData = (): Promise<WholeDataType> => {
  return new Promise((resolve, reject) => {
    const filepath = path.resolve(__dirname, "./json/wholeData.json");
    readFile(filepath).then((buffer) => {
      const json = JSON.parse(buffer.toString());
      resolve(json);
    })
    .catch(reject)
  })
}

const updateJsonWithTargetYmd = async(ymd: number, targetArea: keyof typeof BigGeocode) => {
  const filepath = path.resolve(__dirname, "./json/wholeData.json");
  const prevData = await getExistingData();
  const updated: WholeDataType = JSON.parse(JSON.stringify(prevData));
  try {
    await getXmlDataForYmd(ymd, targetArea)
    .then((wholeData) => {
      Object.assign(updated, wholeData);
    });
  } catch (e) {
    throw e;
  }
  saveFile(filepath, JSON.stringify(updated))
}

const mkdir = (pathStr: string) => {
  return new Promise((resolve, reject) => {
    fs.readdir(pathStr, (err, files) => {
      if (err) {
        fs.mkdir(pathStr, (err) => {
          if (err) {
            mkdir(path.resolve(pathStr, "../"))
            .then(() => mkdir(pathStr))
          } else {
            resolve("ok");
          }
        })
      } else {
        resolve("ok");
      }
    })    
  })
}

const getYmdDataFor = async(ymd: number, targetArea: keyof typeof BigGeocode) => {
  const folderPath = path.resolve(__dirname, `./json/${targetArea}`)
  await mkdir(folderPath);
  const filepath = path.resolve(folderPath, `./${ymd}.json`);
  const data: WholeDataType = {};
  try {
    await getXmlDataForYmd(ymd, targetArea)
    .then((xmlData) => {
      Object.assign(data, xmlData);
    });
  } catch (e) {
    throw e;
  }
  saveFile(filepath, JSON.stringify(data))
}

const getNextYmd = (ymd: number) => {
  const stringYmd = ymd.toString()
  const lastTwoDigit = stringYmd.slice(stringYmd.length - 2, stringYmd.length);
  if (lastTwoDigit === "12") return ymd + 100 - 11;
  return ymd + 1;
}

const getYmdFromTo = (from = 200801, to = 202012) => {
  let curYmd = from;
  const result = [];
  result.push(curYmd);
  while (curYmd < to) {
    curYmd = getNextYmd(curYmd);
    result.push(curYmd);
  }
  return result;
}

type ScrapOption = {
  from: number,
  to: number,
  targetArea: keyof typeof BigGeocode,
  force?: boolean,
  seperate?: boolean,
}
const scrapFromToFor = async(option: ScrapOption) => {
  const {
    from,
    targetArea,
    to,
    seperate,
  } = option;
  let targetYmd: number[] = getYmdFromTo(from, to)
  for (let i = 0; i < targetYmd.length; i += 1) {
    const ymd = targetYmd[i];
    try {
      if (seperate) {
        await getYmdDataFor(ymd, targetArea);
      } else {
        await updateJsonWithTargetYmd(ymd, targetArea);
      }
    } catch (e) {
      throw e;
    }
  }
}

scrapFromToFor({
  from: 201406,
  to: 201706,
  targetArea: "seoul",
  seperate: true,
});

// Object.entries(geocode).forEach(([name, code]) => {
//   getRealEstateDeal("dandok", code, 200801)
//   .then((text) => console.log(text));
// })
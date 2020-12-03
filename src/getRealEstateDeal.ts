import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({path: path.resolve(__dirname, "../.env")});

const key = process.env.API_KEY;
const endpoint = {
  commercial: "getRTMSDataSvcNrgTrade",
  land: "getRTMSDataSvcLandTrade",
  offi: "getRTMSDataSvcOffiTrade",
  dasedae: "getRTMSDataSvcRHTrade",
  apart: "getRTMSDataSvcAptTrade",
  dandok: "getRTMSDataSvcSHTrade",
}

export type RealEstateTypes = "commercial" | "land" | "offi" | "dasedae" | "apart" | "dandok";

const getRealEstateDeal = (type: keyof typeof endpoint="commercial", geocode=11110, dealymd=201512) => {
  const PORT = (type === "dasedae" || type === "apart" || type === "dandok") ? ":8081" : ""
  const baseUrl = `http://openapi.molit.go.kr${PORT}/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc`;
  let queryParams = '?' + encodeURIComponent('serviceKey') + '=' + key; /*Service Key*/
  queryParams += '&' + encodeURIComponent('LAWD_CD') + '=' + encodeURIComponent(geocode); /**/
  queryParams += '&' + encodeURIComponent('DEAL_YMD') + '=' + encodeURIComponent(dealymd); /**/
  const url = `${baseUrl}/${endpoint[type]}${queryParams}`
  return fetch(url)
    .then((res) => res.text())
    .catch((e) => console.log(e))
}

export default getRealEstateDeal;
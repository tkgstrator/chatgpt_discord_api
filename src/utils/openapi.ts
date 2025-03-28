import info from '@/../package.json'
import { lowerCase, startCase, upperFirst } from 'lodash'

export const reference: ApiReferenceOptions = {
  spec: {
    url: '/openapi.json'
  },
  defaultHttpClient: {
    targetKey: 'node',
    clientKey: 'axios'
  },
  layout: 'modern',
  hideDownloadButton: true,
  darkMode: true,
  metaData: {
    title: startCase(lowerCase(info.name))
  },
  theme: 'default',
  defaultOpenAllTags: false,
  tagsSorter: 'alpha'
}

export const specification = {
  openapi: '3.1.0',
  info: {
    title: startCase(lowerCase(info.name)),
    // @ts-ignore
    version: info.version,
    // @ts-ignore
    description: info.description,
    license: {
      // @ts-ignore
      name: info.license
    }
  }
}

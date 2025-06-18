//=================================================================================================
// DENO LAND
//=================================================================================================

import { outdent } from "https://deno.land/x/outdent@v0.8.0/mod.ts"
import { nanoid } from "https://deno.land/x/nanoid@v3.0.0/mod.ts"
import { crc32 } from "https://deno.land/x/crc32@v0.2.2/mod.ts"
import * as zod from "https://deno.land/x/zod@v3.23.8/mod.ts"
import * as oauth2 from "https://deno.land/x/oauth2_client@v1.0.2/mod.ts"
import * as djwt from "https://deno.land/x/djwt@v3.0.2/mod.ts"
import * as oak from "https://deno.land/x/oak@v16.1.0/mod.ts"
import { Body as oakBody } from "https://deno.land/x/oak@v16.1.0/body.ts" // ugh, oak.Body wasn't exported by default
import * as oakCommons from "https://deno.land/x/oak_commons@0.11.0/http_errors.ts"
import { oakCors } from "https://deno.land/x/cors/mod.ts"

import * as awsClient from "https://deno.land/x/aws_api@v0.8.1/client/mod.ts"
import { S3 } from "https://deno.land/x/aws_api@v0.8.1/services/s3/mod.ts"

import * as esbuild from "https://deno.land/x/esbuild@v0.20.2/mod.js"

//=================================================================================================
// JSR
//=================================================================================================

import { denoPlugins as esbuildDenoPlugins } from "jsr:@luca/esbuild-deno-loader@0.10.3"

//=================================================================================================
// ESM.SH
//=================================================================================================

import typescript from "https://esm.sh/typescript@5.4.5"
import pluralize from "https://esm.sh/pluralize@8.0.0"
import * as kysely from "https://esm.sh/kysely@0.27.3"
import { md5 } from "https://esm.sh/hash-wasm@4.11.0"

//=================================================================================================
// NPM
//=================================================================================================

import tailwind from "npm:tailwindcss@3.4.4"
import postcss from "npm:postcss@8.4.38"
import autoprefixer from "npm:autoprefixer@10.4.19"
import highlight from "npm:highlight.js@11.9.0"
import { Redis } from "npm:ioredis@5.4.1"
import bullmq from "npm:bullmq@5.7.8"
import postmark from "npm:postmark@4.0.4"
import mysql2 from "npm:mysql2@3.11.5"
import mysql2Promise from "npm:mysql2@3.11.5/promise"

//=================================================================================================
// NPM - Luxon
//=================================================================================================

// @deno-types="npm:@types/luxon@3.4.2"
import * as luxon from "npm:luxon@3.4.2"

luxon.Settings.defaultZone = "UTC"
luxon.Settings.throwOnInvalid = true

declare module "npm:luxon@3.4.2" {
  interface TSSettings {
    throwOnInvalid: true;
  }
}

declare global {
  type DateTime = luxon.DateTime
  type DurationLike = luxon.DurationLike
  const DateTime: typeof luxon.DateTime
}

// deno-lint-ignore no-explicit-any
(globalThis as any).DateTime = luxon.DateTime

function datetimeTaggedTemplateLiteral(strings: TemplateStringsArray, ...values: unknown[]) {
  const value = strings.reduce((result, str, i) => {
    const value = values[i] || ''
    return result + str + value
  }, '')
  try {
    return DateTime.fromISO(value, { setZone: true })
  } catch {
    throw new Error(`invalid datetime string ${value}`)
  }
}

declare global {
  const DT: typeof datetimeTaggedTemplateLiteral
}

// deno-lint-ignore no-explicit-any
(globalThis as any).DT = datetimeTaggedTemplateLiteral

//=================================================================================================
// CUSTOM ZOD VALIDATIONS
//=================================================================================================

const z = {
  ...zod,
  datetime: () => zod.custom<DateTime>((value) => {
    return DateTime.isDateTime(value) && value.isValid
  }, {
    message: "Invalid Datetime"
  }),
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export { type JSX } from "preact"

export {
  autoprefixer,
  awsClient,
  bullmq,
  crc32,
  djwt,
  esbuild,
  esbuildDenoPlugins,
  highlight,
  kysely,
  md5,
  mysql2,
  mysql2Promise,
  nanoid,
  oak,
  oakBody,
  oakCommons,
  oakCors,
  oauth2,
  outdent,
  pluralize,
  postcss,
  postmark,
  Redis,
  S3,
  tailwind,
  typescript,
  z, zod, // z.* provides validation methods, zod.* provides types
}
